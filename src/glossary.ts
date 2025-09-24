import path from "path";
import { fields_get } from "@terrakernel/odxproxy-client-js";
import * as fs from "node:fs";


/**
 * GlossaryEntry
 *
 * Main Purpose:
 * -------------
 * This interface defines the structure of a glossary entry that maps
 * natural language business terms (used by humans or LLMs) to the
 * corresponding Odoo ERP model, including metadata, actions, fields,
 * and hints.
 *
 * The glossary acts as a "translation layer" between user-friendly
 * requests (e.g. "create a new customer", "update vendor email")
 * and the technical Odoo API models (e.g. `res.partner`).
 *
 * Why it's important:
 * -------------------
 * - It gives the LLM more context and detail about each model.
 * - The richer the metadata, descriptions, examples, and hints,
 *   the better the LLM can interpret vague or ambiguous requests.
 * - It helps constrain the model's behavior to safe actions
 *   (by listing available actions).
 * - It improves discoverability of model-specific behavior
 *   (like custom actions).
 * - It helps resolve synonyms and Many2One relationships.
 *
 * Recommendation:
 * ---------------
 * Always provide as much detail as possible in the glossary
 * (descriptions, aliases, examples, available actions, field hints).
 * The more detail you add, the more accurately the LLM can generate
 * correct queries, handle edge cases, and avoid mistakes.
 */
export interface GlossaryEntry {

    /**
     * The technical Odoo model name (e.g. "res.partner", "sale.order").
     * This is the canonical identifier for the entry.
     */
    model: string;

    /**
     * Alternative names or synonyms (e.g. ["customer", "vendor"]).
     * Useful for mapping natural language variations to the model.
     */
    aliases?: string[];

    /**
     * High-level domain grouping for this model (e.g. "sales", "accounting").
     * Helps with organization, navigation, or filtering of glossary entries.
     */
    category?: string;

    /**
     * A concise description of what this model represents in the business context.
     */
    description?: string;

    /**
     * A longer, more detailed description providing extra guidance,
     * caveats, or usage notes for this model.
     */
    extra_description?: string;

    /**
     * The generic actions that are allowed on this model
     * (e.g. ["create", "read", "update", "delete", "search"]).
     * Used to define safe operational boundaries.
     */
    available_actions?: string[];

    /**
     * Model-specific methods or behaviors that can be invoked.
     * For example, `{ "sale.order": ["action_confirm", "action_cancel"] }`.
     */
    model_specific_actions?: Record<string, any>;

    /**
     * Aliases for Many2One fields that point to this model.
     * Helps the system resolve relationships expressed in natural language
     * (e.g. "partner" → `res.partner`).
     */
    aliases_many2one_fields?: string[];

    /**
     * Defines where field metadata should come from:
     *  - "dynamic": fetch using `fields_get`
     *  - "static": predefined in this glossary entry
     */
    fields_source?: "dynamic" | "static";

    /**
     * Optional predefined field metadata for this model.
     * Typically used when fields_source is "static".
     */
    fields?: Record<string, any>;

    /**
     * Example usages or input/output patterns showing how this model
     * might be referenced or used in operations.
     */
    examples?: any[];

    /**
     * Extra natural-language hints for disambiguation or clarification.
     * For example, ["used for storing company and contact information"].
     */
    hints?: string[];
}


/**
 * Loads and enriches a glossary of Odoo models with field metadata.
 *
 * Main Purpose:
 * -------------
 * This function iterates over a list of `GlossaryEntry` objects and, for any entry
 * marked with `fields_source: "dynamic"`, it automatically fetches the model's
 * field definitions from Odoo using the `fields_get` method.
 *
 * The retrieved field metadata is then attached to the glossary entry under
 * `entry.fields`, allowing the glossary to provide both human-readable
 * descriptions (from static data) and technical schema details (from Odoo itself).
 *
 * Why it's useful:
 * ----------------
 * - Ensures glossary entries always have up-to-date field metadata from Odoo.
 * - Allows LLMs and tools to understand what fields exist on a model,
 *   including their types, labels, and constraints.
 * - Reduces the need for manually maintaining field structures in the glossary.
 *
 * Cost / Performance Notes:
 * -------------------------
 * - Each glossary entry with `fields_source: "dynamic"` triggers an individual
 *   `fields_get` RPC call to Odoo.
 * - This can be **expensive** if many models are listed, since Odoo will
 *   serialize and return all field definitions for each one.
 * - Recommended mitigations:
 *   • Limit dynamic loading only to models where field metadata is essential.
 *   • Cache results in memory or persist to disk to avoid repeated lookups.
 *   • Refresh glossary data periodically instead of on every startup.
 *
 * Error Handling:
 * ---------------
 * - If fetching `fields_get` fails for a model, an error is logged but the
 *   function continues processing other entries.
 *
 * @param {GlossaryEntry[]} glossary - An array of glossary entries that describe Odoo models.
 *   Entries with `fields_source: "dynamic"` will be enriched with field metadata
 *   from Odoo.
 *
 * @returns {Promise<GlossaryEntry[]>} A promise resolving to the updated glossary,
 *   where entries may now include populated `fields`.
 *
 * @example
 * const glossary = [
 *   { model: "res.partner", fields_source: "dynamic" },
 *   { model: "res.company", fields_source: "static", fields: { name: { type: "char" } } }
 * ];
 *
 * const enriched = await loadGlossary(glossary);
 * console.log(enriched[0].fields); // shows dynamic fields from Odoo
 */
export async function loadGlossary(glossary: GlossaryEntry[]): Promise<GlossaryEntry[]> {
    for (const entry of glossary) {
        if (entry.fields_source === "dynamic") {
            try {
                const res = await fields_get(entry.model, {context: {tz: "UTC"}});
                entry.fields = res.result ?? {};
            } catch (error) {
                console.error(`Error fetching fields for model ${entry.model}:`, error);
            }
        }
    }
    return glossary;
}