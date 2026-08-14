import {database} from './client';
import {runMigrations} from './migrations';

const M2_SEED_KEY = 'task_system_seed_v2';
const M4_SEED_KEY = 'scheduling_seed_v3';
const M5_SEED_KEY = 'money_seed_v4';
const M6_SEED_KEY = 'gym_seed_v5';
const M7_SEED_KEY = 'study_seed_v6';
const M8_SEED_KEY = 'progress_seed_v7';

async function configureDatabase() {
  await database.execute('PRAGMA journal_mode = WAL;');
  await database.execute('PRAGMA foreign_keys = ON;');
}

async function seedTaskSystem() {
  await database.transaction(async tx => {
    const seedResult = await tx.execute(
      'SELECT value FROM app_metadata WHERE key = ? LIMIT 1;',
      [M2_SEED_KEY],
    );
    if (seedResult.rows.length > 0) {
      return;
    }

    const now = new Date().toISOString();

    await tx.execute(
      `INSERT OR IGNORE INTO workspaces(id, name, icon, position, created_at, updated_at)
       VALUES ('workspace_life', 'My Life', '◉', 1, ?, ?);`,
      [now, now],
    );

    const boards = [
      ['board_work', 'Work', 'work', '💼', 1],
      ['board_personal', 'Personal', 'personal', '◎', 2],
      ['board_study', 'Study', 'study', '📚', 3],
    ] as const;
    for (const [id, name, context, icon, position] of boards) {
      await tx.execute(
        `INSERT OR IGNORE INTO boards(
          id, workspace_id, name, context, icon, position, created_at, updated_at
        ) VALUES (?, 'workspace_life', ?, ?, ?, ?, ?, ?);`,
        [id, name, context, icon, position, now, now],
      );
    }

    const columns = [
      ['column_work_todo', 'board_work', 'To do', 'todo', 1],
      ['column_work_doing', 'board_work', 'In progress', 'in_progress', 2],
      ['column_work_done', 'board_work', 'Done', 'done', 3],
      ['column_personal_todo', 'board_personal', 'To do', 'todo', 1],
      ['column_personal_doing', 'board_personal', 'In progress', 'in_progress', 2],
      ['column_personal_done', 'board_personal', 'Done', 'done', 3],
      ['column_study_todo', 'board_study', 'To learn', 'todo', 1],
      ['column_study_doing', 'board_study', 'Learning', 'in_progress', 2],
      ['column_study_done', 'board_study', 'Learned', 'done', 3],
    ] as const;
    for (const [id, boardId, title, semanticStatus, position] of columns) {
      await tx.execute(
        `INSERT OR IGNORE INTO board_columns(
          id, board_id, title, semantic_status, position, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [id, boardId, title, semanticStatus, position, now, now],
      );
    }

    const labels = [
      ['label_deep_work', 'Deep work', 'blue'],
      ['label_important', 'Important', 'red'],
      ['label_quick_win', 'Quick win', 'green'],
      ['label_waiting', 'Waiting', 'orange'],
      ['label_learning', 'Learning', 'purple'],
    ] as const;
    for (const [id, name, tone] of labels) {
      await tx.execute(
        `INSERT OR IGNORE INTO labels(id, name, tone, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?);`,
        [id, name, tone, now, now],
      );
    }

    // Preserve Milestone 2 data by assigning every old task to a default board/column.
    await tx.execute(
      `UPDATE tasks
       SET board_id = CASE
         WHEN context = 'work' THEN 'board_work'
         WHEN context = 'study' THEN 'board_study'
         ELSE 'board_personal'
       END
       WHERE board_id IS NULL;`,
    );
    await tx.execute(
      `UPDATE tasks
       SET column_id = CASE
         WHEN context = 'work' AND status = 'done' THEN 'column_work_done'
         WHEN context = 'work' AND status = 'in_progress' THEN 'column_work_doing'
         WHEN context = 'work' THEN 'column_work_todo'
         WHEN context = 'study' AND status = 'done' THEN 'column_study_done'
         WHEN context = 'study' AND status = 'in_progress' THEN 'column_study_doing'
         WHEN context = 'study' THEN 'column_study_todo'
         WHEN status = 'done' THEN 'column_personal_done'
         WHEN status = 'in_progress' THEN 'column_personal_doing'
         ELSE 'column_personal_todo'
       END
       WHERE column_id IS NULL;`,
    );

    const taskCountResult = await tx.execute('SELECT COUNT(*) AS count FROM tasks WHERE deleted_at IS NULL;');
    const taskCount = Number((taskCountResult.rows[0] as {count?: number} | undefined)?.count ?? 0);
    if (taskCount === 0) {
      const sampleTasks = [
        ['task_m3_work_1', 'Design authentication flow', 'work', 'board_work', 'column_work_todo', 'high', 45, 1],
        ['task_m3_work_2', 'Implement offline repository tests', 'work', 'board_work', 'column_work_doing', 'urgent', 60, 2],
        ['task_m3_study_1', 'Study React Native architecture', 'study', 'board_study', 'column_study_todo', 'medium', 50, 1],
        ['task_m3_personal_1', 'Plan weekly priorities', 'personal', 'board_personal', 'column_personal_todo', 'medium', 20, 1],
      ] as const;
      for (const [id, title, context, boardId, columnId, priority, estimate, sortOrder] of sampleTasks) {
        await tx.execute(
          `INSERT INTO tasks(
            id, title, notes, status, context, due_at, sort_order, version, sync_state,
            created_at, updated_at, deleted_at, board_id, column_id, priority, estimate_minutes, completed_at
          ) VALUES (?, ?, NULL, ?, ?, NULL, ?, 1, 'local', ?, ?, NULL, ?, ?, ?, ?, NULL);`,
          [id, title, columnId.includes('doing') ? 'in_progress' : 'todo', context, sortOrder, now, now, boardId, columnId, priority, estimate],
        );
      }
    }

    await tx.execute(
      `INSERT INTO app_metadata(key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
      [M2_SEED_KEY, '1', now],
    );
  });
}


async function seedSchedulingSystem() {
  await database.transaction(async tx => {
    const result = await tx.execute('SELECT value FROM app_metadata WHERE key = ? LIMIT 1;', [M4_SEED_KEY]);
    if (result.rows.length > 0) return;

    const now = new Date();
    const createdAt = now.toISOString();
    const todayWork = new Date(now);
    todayWork.setHours(Math.max(now.getHours() + 1, 10), 0, 0, 0);
    if (todayWork.getDate() !== now.getDate()) {
      todayWork.setTime(now.getTime() + 60 * 60 * 1000);
    }
    const tonightStudy = new Date(now);
    tonightStudy.setHours(20, 0, 0, 0);
    if (tonightStudy.getTime() <= now.getTime()) tonightStudy.setDate(tonightStudy.getDate() + 1);
    const tomorrowMorning = new Date(now);
    tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
    tomorrowMorning.setHours(9, 0, 0, 0);

    await tx.execute(`UPDATE tasks SET start_at = ? WHERE id = 'task_m3_work_1' AND start_at IS NULL;`, [todayWork.toISOString()]);
    await tx.execute(`UPDATE tasks SET start_at = ? WHERE id = 'task_m3_study_1' AND start_at IS NULL;`, [tonightStudy.toISOString()]);

    const reminderCount = await tx.execute(`SELECT COUNT(*) AS count FROM reminders;`);
    const count = Number((reminderCount.rows[0] as {count?: number} | undefined)?.count ?? 0);
    if (count === 0) {
      await tx.execute(
        `INSERT INTO reminders(id, title, notes, context, scheduled_at, repeat_rule, status,
          linked_task_id, notification_id, completed_at, created_at, updated_at)
         VALUES ('reminder_m4_1', 'Review tomorrow priorities', 'A quick LifeOS planning check-in',
          'personal', ?, 'daily', 'scheduled', NULL, NULL, NULL, ?, ?);`,
        [tomorrowMorning.toISOString(), createdAt, createdAt],
      );
    }

    await tx.execute(
      `INSERT INTO app_metadata(key, value, updated_at) VALUES (?, '1', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
      [M4_SEED_KEY, createdAt],
    );
  });
}


async function seedMoneySystem() {
  await database.transaction(async tx => {
    const result = await tx.execute('SELECT value FROM app_metadata WHERE key = ? LIMIT 1;', [M5_SEED_KEY]);
    if (result.rows.length > 0) return;

    const now = new Date();
    const createdAt = now.toISOString();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const atDay = (day: number, hour = 12) => {
      const value = new Date(now.getFullYear(), now.getMonth(), Math.min(day, now.getDate()), hour, 0, 0, 0);
      return value.toISOString();
    };

    await tx.execute(
      `INSERT OR IGNORE INTO accounts(id, name, type, currency, opening_balance_minor, position, archived_at, created_at, updated_at)
       VALUES ('account_main', 'Main Account', 'bank', 'AED', 250000, 1, NULL, ?, ?);`,
      [createdAt, createdAt],
    );

    const categories = [
      ['cat_salary', 'Salary', 'income', '💼', 'green', 1],
      ['cat_food', 'Food & Dining', 'expense', '🍽️', 'orange', 1],
      ['cat_groceries', 'Groceries', 'expense', '🛒', 'green', 2],
      ['cat_transport', 'Transport', 'expense', '🚗', 'blue', 3],
      ['cat_home', 'Home & Bills', 'expense', '🏠', 'purple', 4],
      ['cat_shopping', 'Shopping', 'expense', '🛍️', 'pink', 5],
      ['cat_fitness', 'Fitness', 'expense', '🏋️', 'green', 6],
      ['cat_learning', 'Learning', 'expense', '📚', 'blue', 7],
      ['cat_other', 'Other', 'expense', '◎', 'gray', 8],
    ] as const;
    for (const [id, name, kind, icon, tone, position] of categories) {
      await tx.execute(
        `INSERT OR IGNORE INTO finance_categories(id, name, kind, icon, tone, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [id, name, kind, icon, tone, position, createdAt, createdAt],
      );
    }

    const transactionCount = await tx.execute(`SELECT COUNT(*) AS count FROM transactions WHERE deleted_at IS NULL;`);
    const count = Number((transactionCount.rows[0] as {count?: number} | undefined)?.count ?? 0);
    if (count === 0) {
      const rows = [
        ['txn_seed_salary', 'cat_salary', 'income', 1200000, 'Salary', atDay(1, 9)],
        ['txn_seed_grocery', 'cat_groceries', 'expense', 18640, 'Groceries', atDay(Math.max(1, now.getDate() - 3), 18)],
        ['txn_seed_transport', 'cat_transport', 'expense', 9200, 'Fuel', atDay(Math.max(1, now.getDate() - 2), 19)],
        ['txn_seed_food', 'cat_food', 'expense', 5750, 'Lunch', atDay(Math.max(1, now.getDate() - 1), 13)],
      ] as const;
      for (const [id, categoryId, kind, amountMinor, merchant, occurredAt] of rows) {
        await tx.execute(
          `INSERT INTO transactions(id, account_id, category_id, kind, amount_minor, merchant, notes, occurred_at, source, shopping_list_id, created_at, updated_at, deleted_at)
           VALUES (?, 'account_main', ?, ?, ?, ?, NULL, ?, 'manual', NULL, ?, ?, NULL);`,
          [id, categoryId, kind, amountMinor, merchant, occurredAt, createdAt, createdAt],
        );
      }
    }

    const budgets = [
      ['budget_food', 'cat_food', 100000],
      ['budget_groceries', 'cat_groceries', 80000],
      ['budget_transport', 'cat_transport', 70000],
      ['budget_shopping', 'cat_shopping', 60000],
    ] as const;
    for (const [id, categoryId, limitMinor] of budgets) {
      await tx.execute(
        `INSERT OR IGNORE INTO budgets(id, category_id, month_key, limit_minor, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [id, categoryId, monthKey, limitMinor, createdAt, createdAt],
      );
    }

    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0, 0).toISOString();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await tx.execute(
      `INSERT OR IGNORE INTO recurring_payments(id, title, account_id, category_id, amount_minor, frequency, payment_type, next_due_at, active, created_at, updated_at)
       VALUES ('recurring_internet', 'Home Internet', 'account_main', 'cat_home', 29900, 'monthly', 'bill', ?, 1, ?, ?);`,
      [nextMonth, createdAt, createdAt],
    );
    await tx.execute(
      `INSERT OR IGNORE INTO recurring_payments(id, title, account_id, category_id, amount_minor, frequency, payment_type, next_due_at, active, created_at, updated_at)
       VALUES ('recurring_gym', 'Gym Membership', 'account_main', 'cat_fitness', 18000, 'monthly', 'subscription', ?, 1, ?, ?);`,
      [nextWeek, createdAt, createdAt],
    );

    await tx.execute(
      `INSERT OR IGNORE INTO shopping_lists(id, name, budget_minor, currency, status, created_at, updated_at)
       VALUES ('shopping_weekly', 'Weekly groceries', 15000, 'AED', 'active', ?, ?);`,
      [createdAt, createdAt],
    );
    const shoppingItems = [
      ['shopping_milk', 'Milk', 700, 1],
      ['shopping_eggs', 'Eggs', 1200, 2],
      ['shopping_chicken', 'Chicken breast', 2500, 3],
      ['shopping_bananas', 'Bananas', 800, 4],
    ] as const;
    for (const [id, title, unitPrice, position] of shoppingItems) {
      await tx.execute(
        `INSERT OR IGNORE INTO shopping_items(id, list_id, title, quantity, unit_price_minor, checked, position, created_at, updated_at)
         VALUES (?, 'shopping_weekly', ?, 1, ?, 0, ?, ?, ?);`,
        [id, title, unitPrice, position, createdAt, createdAt],
      );
    }

    await tx.execute(
      `INSERT INTO app_metadata(key, value, updated_at) VALUES (?, '1', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
      [M5_SEED_KEY, createdAt],
    );
  });
}


async function seedGymSystem() {
  await database.transaction(async tx => {
    const result = await tx.execute('SELECT value FROM app_metadata WHERE key = ? LIMIT 1;', [M6_SEED_KEY]);
    if (result.rows.length > 0) return;

    const now = new Date().toISOString();
    const exercises = [
      ['exercise_bench_press', 'Bench Press', 'Chest', 'Triceps,Front delts', 'Barbell + bench', 'Keep your upper back braced, lower the bar with control to the lower chest, then press without bouncing.', 'bench-press', 120],
      ['exercise_incline_press', 'Incline Dumbbell Press', 'Upper chest', 'Triceps,Front delts', 'Dumbbells + incline bench', 'Set a moderate incline, keep wrists stacked over elbows, lower under control and press the dumbbells up and slightly inward.', 'incline-press', 90],
      ['exercise_shoulder_press', 'Shoulder Press', 'Shoulders', 'Triceps', 'Dumbbells', 'Brace your trunk, keep forearms vertical and press overhead without overextending the lower back.', 'shoulder-press', 90],
      ['exercise_lat_pulldown', 'Lat Pulldown', 'Back', 'Biceps', 'Cable machine', 'Keep your chest tall, pull the bar toward the upper chest by driving elbows down, then return with control.', 'lat-pulldown', 90],
      ['exercise_seated_row', 'Seated Cable Row', 'Back', 'Biceps,Rear delts', 'Cable machine', 'Stay tall, pull the handle toward the lower ribs, squeeze the shoulder blades, and avoid excessive torso swing.', 'seated-row', 90],
      ['exercise_bicep_curl', 'Dumbbell Bicep Curl', 'Biceps', 'Forearms', 'Dumbbells', 'Keep elbows close to your sides, curl without swinging, and lower the dumbbells under control.', 'bicep-curl', 60],
      ['exercise_back_squat', 'Back Squat', 'Quadriceps', 'Glutes,Core', 'Barbell + rack', 'Brace before descending, keep the whole foot planted, track knees over toes, and stand by driving through the floor.', 'back-squat', 150],
      ['exercise_rdl', 'Romanian Deadlift', 'Hamstrings', 'Glutes,Back', 'Barbell', 'Push the hips back with a neutral spine, keep the bar close to the legs, and stop when hamstring tension limits the hinge.', 'romanian-deadlift', 120],
    ] as const;
    for (const row of exercises) {
      await tx.execute(
        `INSERT OR IGNORE INTO exercises(id, name, primary_muscle, secondary_muscles, equipment, instructions, image_key, default_rest_seconds, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [...row, now, now],
      );
    }

    const routines = [
      ['routine_push', 'Push Day', 'Chest · shoulders · triceps', '💪', 1],
      ['routine_pull', 'Pull Day', 'Back · biceps', '🧲', 2],
      ['routine_legs', 'Leg Day', 'Quads · hamstrings · glutes', '🦵', 3],
    ] as const;
    for (const row of routines) {
      await tx.execute(
        `INSERT OR IGNORE INTO workout_routines(id, name, subtitle, icon, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [...row, now, now],
      );
    }

    const plan = [
      ['routine_push', 'exercise_bench_press', 1, 3, 6, 10, 120, 'Primary strength movement'],
      ['routine_push', 'exercise_incline_press', 2, 3, 8, 12, 90, null],
      ['routine_push', 'exercise_shoulder_press', 3, 3, 8, 12, 90, null],
      ['routine_pull', 'exercise_lat_pulldown', 1, 3, 8, 12, 90, null],
      ['routine_pull', 'exercise_seated_row', 2, 3, 8, 12, 90, null],
      ['routine_pull', 'exercise_bicep_curl', 3, 3, 10, 15, 60, null],
      ['routine_legs', 'exercise_back_squat', 1, 3, 5, 8, 150, 'Primary strength movement'],
      ['routine_legs', 'exercise_rdl', 2, 3, 8, 12, 120, null],
    ] as const;
    for (const row of plan) {
      await tx.execute(
        `INSERT OR IGNORE INTO routine_exercises(routine_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, rest_seconds, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [...row],
      );
    }

    await tx.execute(
      `INSERT INTO app_metadata(key, value, updated_at) VALUES (?, '1', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
      [M6_SEED_KEY, now],
    );
  });
}


async function seedStudySystem() {
  await database.transaction(async tx => {
    const result = await tx.execute('SELECT value FROM app_metadata WHERE key = ? LIMIT 1;', [M7_SEED_KEY]);
    if (result.rows.length > 0) return;

    const now = new Date().toISOString();
    const subjects = [
      ['subject_rn', 'React Native', 'Mobile architecture, performance and native integration', '⚛️', 'purple', 1],
      ['subject_js', 'JavaScript', 'Language fundamentals and advanced patterns', 'JS', 'yellow', 2],
      ['subject_system', 'System Design', 'Scalable software and mobile architecture', '◇', 'blue', 3],
    ] as const;
    for (const row of subjects) {
      await tx.execute(
        `INSERT OR IGNORE INTO study_subjects(id, name, description, icon, tone, position, archived_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?);`,
        [...row, now, now],
      );
    }

    const notes = [
      ['material_rn_arch', 'subject_rn', 'React Native architecture notes', 'React Native separates JavaScript application logic from native platform execution. A senior engineer should understand rendering, the New Architecture, JSI, Fabric, TurboModules, Hermes, native module boundaries, performance measurement, and when native code is justified.'],
      ['material_js_closure', 'subject_js', 'Closures — quick revision', 'A closure is the combination of a function and the lexical environment in which it was created. It lets a function continue accessing variables from an outer scope after that outer function has returned. Common production uses include encapsulation, factories, callbacks, memoization, and event handlers.'],
      ['material_system_cache', 'subject_system', 'Caching mental model', 'Caching trades freshness and invalidation complexity for lower latency and reduced load. Decide what is cached, where it lives, how long it remains valid, who owns invalidation, and what happens when cache and source of truth disagree.'],
    ] as const;
    for (const [id, subjectId, title, body] of notes) {
      await tx.execute(
        `INSERT OR IGNORE INTO study_materials(id, subject_id, title, kind, body_text, local_uri, mime_type, original_name, size_bytes, progress_percent, last_opened_at, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, 'note', ?, NULL, 'text/plain', NULL, NULL, 0, ?, ?, ?, NULL);`,
        [id, subjectId, title, body, now, now, now],
      );
      await tx.execute(
        `INSERT OR IGNORE INTO study_knowledge_chunks(id, material_id, chunk_index, content_text, embedding_state, created_at, updated_at)
         VALUES (?, ?, 0, ?, 'pending', ?, ?);`,
        [`chunk_${id}`, id, body, now, now],
      );
    }

    const cards = [
      ['flash_rn_jsi', 'subject_rn', 'material_rn_arch', 'What problem does JSI solve in React Native?', 'It provides a direct C++ interface between JavaScript and native/runtime capabilities, avoiding the old serialized bridge model for supported integrations.'],
      ['flash_js_closure', 'subject_js', 'material_js_closure', 'What does a closure retain?', 'Access to variables from the lexical environment where the function was created.'],
      ['flash_cache', 'subject_system', 'material_system_cache', 'What is the hardest part of caching?', 'Usually invalidation and deciding acceptable staleness, not storing the cached value itself.'],
    ] as const;
    for (const [id, subjectId, materialId, front, back] of cards) {
      await tx.execute(
        `INSERT OR IGNORE INTO flashcards(id, subject_id, material_id, front, back, due_at, interval_days, ease_x1000, repetitions, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 2500, 0, 'learning', ?, ?);`,
        [id, subjectId, materialId, front, back, now, now, now],
      );
    }

    await tx.execute(
      `INSERT INTO app_metadata(key, value, updated_at) VALUES (?, '1', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
      [M7_SEED_KEY, now],
    );
  });
}


async function seedProgressSystem() {
  await database.transaction(async tx => {
    const result = await tx.execute('SELECT value FROM app_metadata WHERE key = ? LIMIT 1;', [M8_SEED_KEY]);
    if (result.rows.length > 0) return;
    const now = new Date();
    const createdAt = now.toISOString();
    const due = new Date(now); due.setDate(due.getDate() + 60);
    const goals = [
      ['goal_ship_lifeos', 'Ship LifeOS V1', 'Complete the core Personal OS milestones and make the product release-ready.', 'work', 12, 7, 'milestones', due.toISOString(), 1],
      ['goal_fitness_consistency', 'Train consistently', 'Build a repeatable four-session weekly training rhythm.', 'fitness', 4, 0, 'sessions/week', null, 2],
      ['goal_learning', 'Study deliberately', 'Protect five focused learning sessions each week.', 'learning', 5, 0, 'sessions/week', null, 3],
    ] as const;
    for (const row of goals) {
      await tx.execute(`INSERT OR IGNORE INTO goals(id,title,description,area,status,target_value,current_value,unit,due_at,position,completed_at,created_at,updated_at)
        VALUES(?,?,?,?,'active',?,?,?,?,?,NULL,?,?);`, [...row, createdAt, createdAt]);
    }
    const milestones = [
      ['goal_m_lifeos_1','goal_ship_lifeos','Offline foundation',1,1],
      ['goal_m_lifeos_2','goal_ship_lifeos','Tasks + Work Mode',1,2],
      ['goal_m_lifeos_3','goal_ship_lifeos','Reminders + Today',1,3],
      ['goal_m_lifeos_4','goal_ship_lifeos','Money + Shopping',1,4],
      ['goal_m_lifeos_5','goal_ship_lifeos','Gym Mode',1,5],
      ['goal_m_lifeos_6','goal_ship_lifeos','Study Mode',1,6],
      ['goal_m_lifeos_7','goal_ship_lifeos','Goals + Habits + Reviews',0,7],
      ['goal_m_lifeos_8','goal_ship_lifeos','Offline AI',0,8],
    ] as const;
    for (const [id,goalId,title,completed,position] of milestones) {
      await tx.execute(`INSERT OR IGNORE INTO goal_milestones(id,goal_id,title,completed,position,completed_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?);`, [id,goalId,title,completed,position,completed?createdAt:null,createdAt,createdAt]);
    }
    const habits = [
      ['habit_plan_day','Plan the day','☀️','personal','daily',7,1],
      ['habit_deep_work','Deep work block','💼','work','daily',5,2],
      ['habit_train','Workout','🏋️','fitness','weekly',4,3],
      ['habit_study','Focused study','📚','learning','daily',5,4],
      ['habit_expense_review','Review spending','💰','money','daily',7,5],
    ] as const;
    for (const row of habits) {
      await tx.execute(`INSERT OR IGNORE INTO habits(id,name,icon,context,frequency,target_per_week,active,position,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?,?);`, [...row, createdAt, createdAt]);
    }
    const routines = [
      ['routine_morning','Morning Reset','☀️','personal',1],
      ['routine_evening','Evening Shutdown','🌙','personal',2],
    ] as const;
    for (const row of routines) {
      await tx.execute(`INSERT OR IGNORE INTO routines(id,name,icon,context,active,position,created_at,updated_at) VALUES(?,?,?,?,1,?,?,?);`, [...row, createdAt, createdAt]);
    }
    const steps = [
      ['routine_step_m1','routine_morning','Review Today screen',1,3,null],
      ['routine_step_m2','routine_morning','Choose top three priorities',2,5,'habit_plan_day'],
      ['routine_step_m3','routine_morning','Start first focus block',3,2,'habit_deep_work'],
      ['routine_step_e1','routine_evening','Close or reschedule unfinished tasks',1,5,null],
      ['routine_step_e2','routine_evening','Review today’s spending',2,3,'habit_expense_review'],
      ['routine_step_e3','routine_evening','Write daily review',3,5,null],
    ] as const;
    for (const row of steps) {
      await tx.execute(`INSERT OR IGNORE INTO routine_steps(id,routine_id,title,position,estimated_minutes,linked_habit_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?);`, [...row, createdAt, createdAt]);
    }
    await tx.execute(`INSERT INTO app_metadata(key,value,updated_at) VALUES(?,'1',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at;`, [M8_SEED_KEY, createdAt]);
  });
}

export async function initializeLocalData() {
  await configureDatabase();
  await runMigrations();
  await seedTaskSystem();
  await seedSchedulingSystem();
  await seedMoneySystem();
  await seedGymSystem();
  await seedStudySystem();
  await seedProgressSystem();
}
