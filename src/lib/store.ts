import fs from 'fs';
import path from 'path';

export interface Todo {
  id: string;
  task: string;
  status: 'pending' | 'completed';
}

export interface Memory {
  id: string;
  content: string;
  timestamp: string;
}

const dataDir = path.join(process.cwd(), 'data');
const todosFile = path.join(dataDir, 'todos.json');
const memoryFile = path.join(dataDir, 'memory.json');

const ensureFile = (filePath: string, defaultContent: any) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
  }
};

export const getTodos = (): Todo[] => {
  ensureFile(todosFile, []);
  const data = fs.readFileSync(todosFile, 'utf-8');
  return JSON.parse(data);
};

export const saveTodos = (todos: Todo[]) => {
  fs.writeFileSync(todosFile, JSON.stringify(todos, null, 2));
};

export const getMemories = (): Memory[] => {
  ensureFile(memoryFile, []);
  const data = fs.readFileSync(memoryFile, 'utf-8');
  return JSON.parse(data);
};

export const saveMemories = (memories: Memory[]) => {
  fs.writeFileSync(memoryFile, JSON.stringify(memories, null, 2));
};
