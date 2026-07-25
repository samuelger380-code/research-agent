// 1. Import tools (Anthropic, dotenv)
// 2. Create Anthropic Client
// 3. Define a seach tool - describe what it does and what inputs it needs
// 4. Define the actual search function that runs when Claude requests it
// 5. Send user question + tool defintion to Claude
// 6. Check if Claude wants to use a tool
// - If yes: run the function, send results back to Claude
// - If no: Claude has the final answer
// 7. Print the final answer

// 1. Import tools (Anthropic, dotenv)
const Anthropic = require('@anthropic-ai/sdk')
const {tavily} = require('@tavily/core')
require('dotenv').config()

//2.  Clients
const client = new Anthropic()
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY})

// 3. Define a seach tool
const tools = [
    {
        name: 'search_web',
        description: 'Search the web for current information on a topic',
        input_schema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The seach query to look up'
                }
            },
            required: ['query']
        }
    }
]

// 4. Define the actual search function that runs when claude calls it
async function search_web(query) {
    console.log(`Searching for: ${query}`)
    console.log('About to call Tavily...')
    const result = await tvly.search(query)
    console.log('Tavily responded')
    return JSON.stringify(result.results)
}

// 5. Send user question + tool defintion to Claude
async function runAgent() {
    console.log('Starting agent...')
    const question = "What is the latest news about AI today?"

    let messages = [
        {role: 'user', content: question}
    ]

    let keepGoing = true

    while (keepGoing) {
        console.log('Calling Claude...')
        const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            tools: tools,
            messages: messages
        })

        if (response.stop_reason === 'tool_use') {
            const toolUse = response.content.find(block => block.type === 'tool_use')
            console.log(`Claude wants to use: ${toolUse.name}`)
            console.log(`With input: ${JSON.stringify(toolUse.input)}`)

            const toolResult = await search_web(toolUse.input.query)
            console.log(`Tool result: ${toolResult}`)

            messages.push({role: 'assistant', content: response.content})
            messages.push({role: 'user', content: [{
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: toolResult
            }]})

        } else {
            console.log(response.content[0].text)
            keepGoing = false
        }
    }
}

runAgent()