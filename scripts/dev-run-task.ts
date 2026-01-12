#!/usr/bin/env npx ts-node
/**
 * Dev Script: Run Task
 *
 * Test the agent runtime without the Electron UI.
 * Usage: npx ts-node scripts/dev-run-task.ts [taskId]
 *
 * If no taskId provided, runs the first pending task.
 */

import * as path from 'path';
import { LocalKanbanStore, initStore } from '../src/main/services/LocalKanbanStore';
import { AgentRuntime } from '../src/main/agent/AgentRuntime';
import { MockAgentProvider } from '../src/main/agent/AgentProvider';
import { RalphEngine } from '../src/main/agent/RalphEngine';

const projectRoot = process.cwd();

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Dexteria Dev Script: Run Task');
  console.log('='.repeat(60));
  console.log(`Project Root: ${projectRoot}`);
  console.log('');

  // Initialize store
  const store = initStore(projectRoot);

  // Get task ID from args or use first pending task
  let taskId = process.argv[2];

  if (!taskId) {
    const pendingTasks = store.getPendingTasks('dependency');
    if (pendingTasks.length === 0) {
      console.log('No pending tasks found.');
      return;
    }
    taskId = pendingTasks[0].id;
    console.log(`No task ID provided. Using first pending task: ${taskId}`);
  }

  // Get task details
  const task = store.getTask(taskId);
  if (!task) {
    console.error(`Task not found: ${taskId}`);
    return;
  }

  console.log('');
  console.log('Task Details:');
  console.log('-'.repeat(40));
  console.log(`ID: ${task.id}`);
  console.log(`Title: ${task.title}`);
  console.log(`Status: ${task.status}`);
  console.log(`Priority: ${task.priority}`);
  console.log('');
  console.log('Acceptance Criteria:');
  task.acceptanceCriteria.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
  console.log('');

  // Check for command line flags
  const runRalph = process.argv.includes('--ralph');

  if (runRalph) {
    console.log('Running in Ralph Mode (autonomous)...');
    console.log('-'.repeat(40));

    const ralph = new RalphEngine({
      projectRoot,
      store,
    });

    // Add event listener for progress
    ralph.on((event) => {
      console.log(`[Ralph] ${event.type}: ${JSON.stringify(event.data || {})}`);
    });

    const result = await ralph.startRalphMode({
      maxTasks: 3,
      strategy: 'dependency',
    });

    console.log('');
    console.log('Ralph Mode Complete:');
    console.log('-'.repeat(40));
    console.log(`Success: ${result.success}`);
    console.log(`Processed: ${result.processed}`);
    console.log(`Completed: ${result.completed}`);
    console.log(`Failed: ${result.failed}`);
    console.log(`Blocked: ${result.blocked}`);
  } else {
    console.log('Running single task with MockProvider...');
    console.log('-'.repeat(40));

    // Create runtime with mock provider
    const provider = new MockAgentProvider();
    const runtime = new AgentRuntime({
      projectRoot,
      store,
      provider,
      maxSteps: 10,
    });

    // Run the task
    console.log('Starting task execution...');
    const result = await runtime.runTask(taskId, { mode: 'manual' });

    console.log('');
    console.log('Execution Complete:');
    console.log('-'.repeat(40));
    console.log(`Success: ${result.success}`);
    console.log(`Run ID: ${result.run.id}`);
    console.log(`Status: ${result.run.status}`);
    console.log(`Steps: ${result.run.steps}`);
    console.log(`Files Modified: ${result.run.filesModified.length}`);

    if (result.error) {
      console.log(`Error: ${result.error}`);
    }

    if (result.run.summary) {
      console.log(`Summary: ${result.run.summary}`);
    }

    // Show updated task
    const updatedTask = store.getTask(taskId);
    if (updatedTask) {
      console.log('');
      console.log('Updated Task:');
      console.log('-'.repeat(40));
      console.log(`Status: ${updatedTask.status}`);
      console.log(`Runtime Status: ${updatedTask.runtime.status}`);
      console.log(`Comments: ${updatedTask.comments.length}`);

      // Show latest comment
      if (updatedTask.comments.length > 0) {
        const latest = updatedTask.comments[updatedTask.comments.length - 1];
        console.log('');
        console.log('Latest Comment:');
        console.log(`  Type: ${latest.type}`);
        console.log(`  Author: ${latest.author}`);
        console.log(`  Content: ${latest.content.substring(0, 200)}...`);
      }
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Done!');
}

main().catch(console.error);
