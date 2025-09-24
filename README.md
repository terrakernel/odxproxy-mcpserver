[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/terrakernel-odxproxy-mcpserver-badge.png)](https://mseep.ai/app/terrakernel-odxproxy-mcpserver)

# ODXProxy MCP Server

Official MCP Server for ODXProxy by TERRAKERNEL. PTE. LTD.


## Overview
This package provides a Model Context Protocol (MCP) server that connects ODXProxy with MCP-compatible clients/tools. It exposes capabilities to interact with ODX/Odoo resources programmatically.

## Status
Early version (0.1.x). Expect breaking changes as the APIs evolve.

## Usage
See the entry points in `src/index.ts` and `src/server.ts`. Typical usage is to import the built output from `dist` after building.

```ts
import {OdxInstanceInfo, OdxMCPServer,OdxProxyClientInfo} from "odxproxy-mcpserver";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";


async function main() {
    const env = process.env;
    let clientInfo: OdxProxyClientInfo = {
        instance: {
            url: "ODOO_INSTANCE_URL",
            user_id: 2,
            db: "DB_NAME",
            api_key: "YOUR_ODOO_API_KEY"
        },
        odx_api_key: "YOUR_ODXPROXY_API_KEY",
        gateway_url: "https://gateway.odxproxy.io"
    };
    let server = new OdxMCPServer(clientInfo);
    await server.initBaseResource();

    // If DRY_RUN is set, initialize and exit to allow smoke testing without stdio hang.
    if (env.DRY_RUN === "1") {
        return;
    }
    let transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error(error);
});
```

You can also build the package locally and run from source.

## Scripts
- build: Build ESM/CJS and type declarations with tsup
~~- test: Run Jest in CI mode with JUnit reporter~~
~~- test:watch: Watch mode for Jest~~
~~- prepublishOnly: Build and test before publishing~~

Run with:
```bash
npm run build
```
After you successfully build the package, embed the built output in your project to any supported LLM client like Claude Desktop or your own MCP Client. Visit [https://modelcontextprotocol.io](https://modelcontextprotocol.io/docs/develop/connect-local-servers) for more information about connecting to local MCP Servers

## Development
- Source code: `src/`
- Resources: `res/`
- Built artifacts: `dist/`
- TypeScript config: `tsconfig.json`

## License
MIT License © 2025 TERRAKERNEL. PTE. LTD
See LICENSE file for full text.

## Author
Julian Richie Wajong <julian.wajong@gmail.com>

## Links
- Repository: https://github.com/terrakernel/odxproxy-mcpserver
- Issues: https://github.com/terrakernel/odxproxy-mcpserver/issues