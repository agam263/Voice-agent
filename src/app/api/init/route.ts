import { getTodos, getMemories } from "../../../lib/store";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    todos: getTodos(),
    memories: getMemories()
  });
}
