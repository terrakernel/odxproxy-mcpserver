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
} from '@terrakernel/odxproxy-client-js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadGlossary, GlossaryEntry } from "./glossary";

export interface OdxInstanceInfo{
    url: string;
    user_id: number;
    db: string;
    api_key: string;
}

export interface OdxProxyClientInfo{
    instance: OdxInstanceInfo;
    odx_api_key: string
    gateway_url?: string;
}

export class OdxMCPServer {

    private server: McpServer;
    private OdxConfig: OdxProxyClientInfo;

    /**
     * Initialize the MCPServer.
     * @param {OdxProxyClientInfo} options
     */
    constructor(options: OdxProxyClientInfo) {
        this.server = new McpServer({
            name: "odxproxy-mcpserver",
            version: "0.1.0"
        },{});
        // initialize odxproxy client
        this.OdxConfig = options;
        init(this.OdxConfig);

        this.server.registerTool(
            "odx_config",
            {
                title: "ODXProxy Client Settings",
                description:
                    "Retrieve the ODXProxy client configuration, including server URL, database, gateway endpoint, and user ID. " +
                    "This is useful for understanding which Odoo instance the client is connected to. Client may asks just for some part of the configuration like where does this connected to? you can always answer in full",
                inputSchema: {},
            },
            async () => {
                const settings = {
                    "url": this.OdxConfig.instance.url,
                    "database": this.OdxConfig.instance.db,
                    "gateway": this.OdxConfig.gateway_url,
                    "userUid": this.OdxConfig.instance.user_id,
                };
                return {
                    content: [
                        {
                            type: "text",
                            text:JSON.stringify(settings,null, 2)
                        }]
                }
            });
    }


    /**
     * Establishes a connection between this MCP server instance and a given transport.
     *
     * The transport defines how messages are exchanged between the server and the client
     * (e.g. over stdio, WebSocket, etc.). This method must be called after the server
     * is fully initialized and all the tools/resources is registered to start handling requests and responses.
     * @param {import('@modelcontextprotocol/sdk/shared/transport').Transport} transport
     * @returns {Promise<void>}
     */
    async connect(transport: Transport) {
        await this.server.connect(transport);
    }


    /**
     *
     * Initialize the glossaries for the server. Call this before connect() (optional if you don't need glossaries)
     * @param {GlossaryEntry[]} glossary
     */
    async loadGlossaries(glossary: GlossaryEntry[]) {
        let enrichedGlossary: GlossaryEntry[] = [];
        if (glossary) {
            enrichedGlossary = await loadGlossary(glossary);
        }
        for (const entry of enrichedGlossary) {
            this.server.registerResource(
                `glossary_${entry.model}`,
                `glossary://${entry.model}`,
                {
                   title: `${entry.model} Glossary`,
                   description: entry.description ?? "",
                   tags: [entry.category ?? "odoo",...(entry.aliases ?? [])],
                   examples: entry.examples ?? [],
                   parameters: {}
                }, async(uri) => ({
                    contents: [{
                        uri: uri.href,
                        mimeType: "application/json",
                        text: JSON.stringify(entry, null, 2)
                    }]
                }));
        }
    }

    /**
     *
     * Initialize the base resources for the server. Call this after initialization
     */
    async initBaseResource(glossary?: GlossaryEntry[]) {


        this.server.registerTool("get_companies", {
            title: "Get Companies",
            description: "Retrieve company records from the Odoo `res.company` model. \n\n" +
                "- If `name` is provided, performs a partial, case-insensitive search on company names.\n" +
                "- If `id` is provided, retrieves the exact company with that ID.\n" +
                "- If both `name` and `id` are provided, both filters are applied together.\n" +
                "- If neither is provided, all companies will be returned.\n\n" +
                "💡 Instruction: Many Odoo models (such as `res.partner`, `res.users`, and invoices) " +
                "have a `company_id` field pointing to this model. If you encounter a reference to a company ID, " +
                "you can call this tool with that ID to fetch company details (like name and ID and any other) for context or display.",
            inputSchema: {
                name: z.string().optional(),
                id: z.number().optional(),
            },
        }, async({name, id}) =>{
            let domain: any[] = [];
            if (name) {
                domain.push(["name", "ilike", name]);
            }
            if (id) {
                domain.push(["id", "=", id]);
            }
            let results = await search_read("res.company", [domain] ,{ context:{tz:"Asia/Singapore"} });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(results.result ?? [],null, 2)
                    }
                ]
        }});

        this.server.registerTool(
            "get_partners",
            {
                title: "Get Partners by ID, email, or name",
                description:
                    "Retrieve partner records from the Odoo `res.partner` model. \n\n" +
                    "- If `id` is provided, fetches the exact partner with that ID (other filters are ignored).\n" +
                    "- If `email` is provided, performs an exact match on the email address.\n" +
                    "- If `name` is provided, performs a partial, case-insensitive search on partner names.\n" +
                    "- If both `name` and `email` are provided, partners are matched by either condition.\n" +
                    "- If no input is provided, returns an empty list.\n\n" +
                    "💡 Instruction: Many Odoo models (e.g., invoices, sales orders, users) reference `res.partner` " +
                    "through a `partner_id` field. If you encounter such a reference, call this tool with the partner `id` " +
                    "to retrieve the partner’s details (ID, name, email, ....) for context or display.",
                inputSchema: {
                    id: z.number().optional().describe("Exact partner ID"),
                    email: z.string().email().optional().describe("Exact partner email address"),
                    name: z.string().optional().describe("Partial match on partner name"),
                },
            },
            async ({ id, email, name }) => {
                let domain: any[] = [];

                if (id) {
                    domain = [["id", "=", id]];
                } else if (email && name) {
                    domain = ["|", ["email", "=", email.toLowerCase()], ["name", "ilike", name]];
                } else if (email) {
                    domain = [["email", "=", email.toLowerCase()]];
                } else if (name) {
                    domain = [["name", "ilike", name]];
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: "[]",
                            },
                        ],
                    };
                }

                const partners = await search_read("res.partner", domain, {
                    context: { tz: "Asia/Singapore" },
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(partners.result ?? [], null, 2),
                        },
                    ],
                };
            }
        );

        this.server.registerTool("create_partner",{
            title: "Create Partner",
            description: "Create a new partner record in the Odoo `res.partner` model. \n\n" +
                "- The required field is `name` (the partner’s name).\n" +
                "- Optional fields include `email`, `phone`, and `is_company`.\n" +
                "- Users may provide information one field at a time (e.g., just the name first, then later add email or phone).\n\n" +
                "⚠️ Instruction: Before executing this tool, confirm whether the user wants to provide the optional fields " +
                "(`email`, `phone`, `is_company`). Only proceed once the user confirms or declines these fields.\n\n" +
                "The tool will return `true` once the partner has been successfully created.",
            inputSchema: {
                name: z.string().describe("Name of the partner"),
                email: z.string().email().optional().describe("Email of the partner (optional"),
                phone: z.string().optional().describe("Phone number of the partner (optional)"),
                is_company: z.boolean().optional().describe("Whether this partner is a company (true/false, optional)"),
            }
        }, async({name, email, phone, is_company}) => {
            await create("res.partner", [[{
                name: name,
                email: email ?? false,
                phone: phone ?? false,
                is_company: is_company ?? false,
            }]], {context: {tz: "UTC"}});
            return {
                content: [
                    {
                        type: "text",
                        text: "true"
                    }
                ]
            }
        });
    }

    async getServer() {
        return this.server;
    }
}