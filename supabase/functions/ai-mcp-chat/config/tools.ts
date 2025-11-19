/**
 * MCP Tool Definitions
 * OpenAI function calling format
 */

export const MCP_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_content_library",
      description: "Search tenant Knowledge Base for company information. Use semantic search with synonyms.",
      parameters: {
        type: "object",
        properties: {
          query: { 
            type: "string", 
            description: "Search query with synonyms and related terms" 
          },
          category: { 
            type: "string", 
            description: "Optional category filter (team, products, about, contact, etc.)" 
          },
          limit: {
            type: "number",
            description: "Max results (default 5, max 10)",
            default: 5
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "scrape_website",
      description: "Scrape company website ONLY when content_library returns no results or you need updated info.",
      parameters: {
        type: "object",
        properties: {
          url: { 
            type: "string", 
            description: "Website URL to scrape (optional, defaults to tenant domain)" 
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_companies",
      description: "List companies with optional search. Returns company details.",
      parameters: {
        type: "object",
        properties: {
          q: { type: "string", description: "Search query for company name" },
          limit: { type: "number", description: "Max results (default 25)", default: 25 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_projects",
      description: "List projects for the tenant.",
      parameters: {
        type: "object",
        properties: {
          q: { type: "string", description: "Search query for project title" },
          limit: { type: "number", description: "Max results (default 25)", default: 25 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List tasks for the tenant.",
      parameters: {
        type: "object",
        properties: {
          q: { type: "string", description: "Search query for task title" },
          limit: { type: "number", description: "Max results (default 25)", default: 25 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_applications",
      description: "List available applications/systems (ERP, CRM, etc).",
      parameters: {
        type: "object",
        properties: {
          q: { type: "string", description: "Search query for app name" },
          limit: { type: "number", description: "Max results (default 25)", default: 25 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_company",
      description: "Get detailed company information by ID.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Company UUID" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_project",
      description: "Get detailed project information by ID.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Project UUID" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Create a new project for the tenant.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Project title" },
          description: { type: "string", description: "Project description" },
          company_id: { type: "string", description: "Company UUID (optional)" }
        },
        required: ["title", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Task description (optional)" },
          project_id: { type: "string", description: "Project UUID" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Priority (optional)" }
        },
        required: ["title", "project_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_companies",
      description: "Search companies by name or org_number.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          limit: { type: "number", description: "Max results (default 10)", default: 10 }
        },
        required: ["query"]
      }
    }
  }
];
