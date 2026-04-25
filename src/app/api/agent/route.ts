import { GoogleGenerativeAI } from "@google/generative-ai";
import { getTodos, saveTodos, getMemories, saveMemories } from "../../../lib/store";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// Tool Declarations
const tools = [
  {
    name: "add_todo",
    description: "Add a new task to the user's to-do list.",
    parameters: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "The description of the task to add.",
        },
      },
      required: ["task"],
    },
  },
  {
    name: "update_todo",
    description: "Update the status of an existing to-do list item.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The ID of the task to update.",
        },
        status: {
          type: "string",
          description: "The new status of the task ('pending' or 'completed').",
          enum: ["pending", "completed"]
        },
      },
      required: ["id", "status"],
    },
  },
  {
    name: "delete_todo",
    description: "Delete a task from the user's to-do list.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The ID of the task to delete.",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "list_todos",
    description: "Get the current list of all tasks in the to-do list.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "save_memory",
    description: "Save an important fact or preference about the user to long-term memory. Use this when the user tells you something you should remember for future conversations.",
    parameters: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The fact or preference to remember.",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "recall_memory",
    description: "Recall all stored memories and facts about the user from long-term memory.",
    parameters: {
      type: "object",
      properties: {},
    },
  }
];

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: "You are a helpful, professional voice-based AI assistant. You help the user manage their to-do list and remember important facts about them. Use the provided tools to interact with their to-do list and memory. Always be concise, conversational, and friendly. Do not use markdown since your output will be read aloud by text-to-speech. If you perform an action (like adding a todo or saving a memory), let the user know what you did.",
  tools: [
    {
      functionDeclarations: tools as any
    }
  ],
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { history, message } = body;

    const chat = model.startChat({
      history: history || [],
    });

    let result = await chat.sendMessage(message);
    let call = result.response.functionCalls()?.[0];

    let loopCount = 0;
    // Handle function calls loop
    while (call && loopCount < 5) {
      loopCount++;
      const args = call.args;
      console.log(`[Agent] Calling function: ${call.name} with args:`, args);
      let functionResponse: any;

      if (call.name === "add_todo") {
        const todos = getTodos();
        const newTodo = { id: Date.now().toString(), task: args.task || "Unknown task", status: "pending" as const };
        todos.push(newTodo);
        saveTodos(todos);
        functionResponse = { success: true, message: "Task added successfully.", task: newTodo };
      } 
      else if (call.name === "update_todo") {
        const todos = getTodos();
        const index = todos.findIndex(t => t.id === args.id);
        if (index !== -1) {
          todos[index].status = (args.status === "completed" || args.status === "pending") ? args.status : "completed";
          saveTodos(todos);
          functionResponse = { success: true, message: "Task updated successfully." };
        } else {
          functionResponse = { success: false, error: "Task not found." };
        }
      }
      else if (call.name === "delete_todo") {
        let todos = getTodos();
        const initialLen = todos.length;
        todos = todos.filter(t => t.id !== args.id);
        saveTodos(todos);
        if (todos.length < initialLen) {
          functionResponse = { success: true, message: "Task deleted successfully." };
        } else {
          functionResponse = { success: false, error: "Task not found." };
        }
      }
      else if (call.name === "list_todos") {
        functionResponse = { todos: getTodos() };
      }
      else if (call.name === "save_memory") {
        const memories = getMemories();
        const content = args.content || "Unknown memory";
        const newMem = { id: Date.now().toString(), content, timestamp: new Date().toISOString() };
        memories.push(newMem);
        saveMemories(memories);
        functionResponse = { success: true, message: "Memory saved successfully." };
      }
      else if (call.name === "recall_memory") {
        functionResponse = { memories: getMemories() };
      }
      
      console.log(`[Agent] Function response for ${call.name}:`, functionResponse);

      result = await chat.sendMessage([{
        functionResponse: {
          name: call.name,
          response: functionResponse
        }
      }]);
      call = result.response.functionCalls()?.[0];
    }
    
    if (call) {
      console.warn("[Agent] Function call loop limit reached!");
    }

    return NextResponse.json({
      text: result.response.text(),
      todos: getTodos(),
      memories: getMemories()
    });

  } catch (error: any) {
    console.error("Agent error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
