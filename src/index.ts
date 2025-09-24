/**
 * Package Entry Point (`index.ts`)
 * =================================
 *
 * This file serves as the central export hub for the ODXProxy MCP integration package.
 * It consolidates exports from the server, glossary utilities, and the ODXProxy client bindings,
 * so consumers can import everything they need from a single entrypoint.
 *
 * Exports:
 * --------
 * - **Server**
 *   - `OdxMCPServer` → Main MCP server wrapper for exposing Odoo/ODXProxy models, tools, and resources.
 *   - `OdxInstanceInfo`, `OdxProxyClientInfo` → Type definitions for configuring the server.
 *
 * - **Glossary**
 *   - `loadGlossary` → Utility to enrich glossary entries with Odoo field metadata (`fields_get`).
 *   - `GlossaryEntry` → Type definition for glossary entries, describing models, aliases, actions, etc.
 *
 * - **ODXProxy Client (from `@terrakernel/odxproxy-client-js`)**
 *   - `init` → Initialize the ODXProxy client.
 *   - `search`, `search_read`, `read`, `fields_get`, `search_count` → Query helpers.
 *   - `create`, `remove`, `write`, `call_method` → CRUD and method call helpers.
 *
 * Usage Example:
 * --------------
 * ```ts
 * import { OdxMCPServer, search_read, create } from "odxproxy-mcpserver";
 *
 * // Initialize MCP server
 * const server = new OdxMCPServer({ instance, odx_api_key: "..." });
 *
 * // Query partners
 * const partners = await search_read("res.partner", [["name", "ilike", "Julian"]], { context: { tz: "UTC" } });
 *
 * // Create a new partner
 * await create("res.partner", [[{ name: "New Partner" }]], { context: { tz: "UTC" } });
 * ```
 */

import { OdxMCPServer, OdxInstanceInfo, OdxProxyClientInfo } from "./server";
import { loadGlossary, GlossaryEntry } from "./glossary";
import {
    init,
    search,
    search_read,
    read,
    fields_get,
    search_count,
    create,
    remove,
    write,
    call_method
} from "@terrakernel/odxproxy-client-js";

export {
    OdxMCPServer,
    OdxInstanceInfo,
    OdxProxyClientInfo,
    loadGlossary,
    GlossaryEntry,
    init,
    search,
    search_read,
    read,
    fields_get,
    search_count,
    create,
    remove,
    write,
    call_method,
};