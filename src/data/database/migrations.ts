import {database} from './client';

type Migration = {
  version: number;
  statements: string[];
};

const migrations: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY NOT NULL,
        applied_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS app_metadata (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'todo',
        context TEXT NOT NULL DEFAULT 'personal',
        due_at TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        version INTEGER NOT NULL DEFAULT 1,
        sync_state TEXT NOT NULL DEFAULT 'local',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      ) STRICT;`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_active_status
        ON tasks(deleted_at, status, sort_order, updated_at);`,
      `CREATE TABLE IF NOT EXISTS sync_outbox (
        id TEXT PRIMARY KEY NOT NULL,
        aggregate_type TEXT NOT NULL,
        aggregate_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      ) STRICT;`,
    ],
  },
  {
    version: 2,
    statements: [
      `CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS boards (
        id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        context TEXT NOT NULL,
        icon TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS board_columns (
        id TEXT PRIMARY KEY NOT NULL,
        board_id TEXT NOT NULL,
        title TEXT NOT NULL,
        semantic_status TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(board_id) REFERENCES boards(id) ON DELETE CASCADE
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS labels (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        tone TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS task_labels (
        task_id TEXT NOT NULL,
        label_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY(task_id, label_id),
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY(label_id) REFERENCES labels(id) ON DELETE CASCADE
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS subtasks (
        id TEXT PRIMARY KEY NOT NULL,
        task_id TEXT NOT NULL,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS focus_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        task_id TEXT,
        started_at TEXT NOT NULL,
        ended_at TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE SET NULL
      ) STRICT;`,
      `ALTER TABLE tasks ADD COLUMN board_id TEXT;`,
      `ALTER TABLE tasks ADD COLUMN column_id TEXT;`,
      `ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium';`,
      `ALTER TABLE tasks ADD COLUMN estimate_minutes INTEGER;`,
      `ALTER TABLE tasks ADD COLUMN completed_at TEXT;`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_board_column
        ON tasks(board_id, column_id, deleted_at, sort_order);`,
      `CREATE INDEX IF NOT EXISTS idx_subtasks_task
        ON subtasks(task_id, position);`,
      `CREATE INDEX IF NOT EXISTS idx_focus_sessions_started
        ON focus_sessions(started_at);`,
    ],
  },
  {
    version: 3,
    statements: [
      `ALTER TABLE tasks ADD COLUMN start_at TEXT;`,
      `CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        notes TEXT,
        context TEXT NOT NULL DEFAULT 'personal',
        scheduled_at TEXT NOT NULL,
        repeat_rule TEXT NOT NULL DEFAULT 'none',
        status TEXT NOT NULL DEFAULT 'scheduled',
        linked_task_id TEXT,
        notification_id TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(linked_task_id) REFERENCES tasks(id) ON DELETE SET NULL
      ) STRICT;`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_start_at
        ON tasks(start_at, deleted_at, status);`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_due_at
        ON tasks(due_at, deleted_at, status);`,
      `CREATE INDEX IF NOT EXISTS idx_reminders_schedule
        ON reminders(status, scheduled_at);`,
      `CREATE INDEX IF NOT EXISTS idx_reminders_task
        ON reminders(linked_task_id, status);`,
    ],
  },
  {
    version: 4,
    statements: [
      `CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'AED',
        opening_balance_minor INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0,
        archived_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS finance_categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL CHECK(kind IN ('expense', 'income')),
        icon TEXT NOT NULL,
        tone TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY NOT NULL,
        account_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        kind TEXT NOT NULL CHECK(kind IN ('expense', 'income')),
        amount_minor INTEGER NOT NULL CHECK(amount_minor > 0),
        merchant TEXT,
        notes TEXT,
        occurred_at TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'manual',
        shopping_list_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
        FOREIGN KEY(category_id) REFERENCES finance_categories(id) ON DELETE RESTRICT
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY NOT NULL,
        category_id TEXT NOT NULL,
        month_key TEXT NOT NULL,
        limit_minor INTEGER NOT NULL CHECK(limit_minor >= 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(category_id, month_key),
        FOREIGN KEY(category_id) REFERENCES finance_categories(id) ON DELETE CASCADE
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS recurring_payments (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        account_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        amount_minor INTEGER NOT NULL CHECK(amount_minor > 0),
        frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'monthly', 'yearly')),
        payment_type TEXT NOT NULL CHECK(payment_type IN ('bill', 'subscription')),
        next_due_at TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
        FOREIGN KEY(category_id) REFERENCES finance_categories(id) ON DELETE RESTRICT
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS shopping_lists (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        budget_minor INTEGER,
        currency TEXT NOT NULL DEFAULT 'AED',
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS shopping_items (
        id TEXT PRIMARY KEY NOT NULL,
        list_id TEXT NOT NULL,
        title TEXT NOT NULL,
        quantity REAL NOT NULL DEFAULT 1 CHECK(quantity > 0),
        unit_price_minor INTEGER CHECK(unit_price_minor >= 0),
        checked INTEGER NOT NULL DEFAULT 0 CHECK(checked IN (0, 1)),
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE
      ) STRICT;`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_occurred
        ON transactions(deleted_at, occurred_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_category_month
        ON transactions(category_id, deleted_at, occurred_at);`,
      `CREATE INDEX IF NOT EXISTS idx_budgets_month
        ON budgets(month_key);`,
      `CREATE INDEX IF NOT EXISTS idx_recurring_due
        ON recurring_payments(active, next_due_at);`,
      `CREATE INDEX IF NOT EXISTS idx_shopping_items_list
        ON shopping_items(list_id, checked, position);`,
    ],
  },

  {
    version: 5,
    statements: [
      `CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        primary_muscle TEXT NOT NULL,
        secondary_muscles TEXT NOT NULL DEFAULT '',
        equipment TEXT NOT NULL,
        instructions TEXT NOT NULL,
        image_key TEXT NOT NULL,
        default_rest_seconds INTEGER NOT NULL DEFAULT 90 CHECK(default_rest_seconds >= 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS workout_routines (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        subtitle TEXT NOT NULL,
        icon TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS routine_exercises (
        routine_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        target_sets INTEGER NOT NULL CHECK(target_sets > 0),
        target_reps_min INTEGER NOT NULL CHECK(target_reps_min > 0),
        target_reps_max INTEGER NOT NULL CHECK(target_reps_max >= target_reps_min),
        rest_seconds INTEGER NOT NULL DEFAULT 90 CHECK(rest_seconds >= 0),
        notes TEXT,
        PRIMARY KEY(routine_id, exercise_id),
        FOREIGN KEY(routine_id) REFERENCES workout_routines(id) ON DELETE CASCADE,
        FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        routine_id TEXT,
        title TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('active', 'completed', 'cancelled')),
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration_seconds INTEGER CHECK(duration_seconds IS NULL OR duration_seconds >= 0),
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(routine_id) REFERENCES workout_routines(id) ON DELETE SET NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS workout_sets (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        set_number INTEGER NOT NULL CHECK(set_number > 0),
        weight_grams INTEGER NOT NULL DEFAULT 0 CHECK(weight_grams >= 0),
        reps INTEGER NOT NULL DEFAULT 0 CHECK(reps >= 0),
        completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
        rpe REAL,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
      ) STRICT;`,
      `CREATE INDEX IF NOT EXISTS idx_routine_exercises_order
        ON routine_exercises(routine_id, position);`,
      `CREATE INDEX IF NOT EXISTS idx_workout_sessions_started
        ON workout_sessions(status, started_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_workout_sets_session
        ON workout_sets(session_id, exercise_id, set_number);`,
      `CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_history
        ON workout_sets(exercise_id, completed, completed_at);`,
    ],
  },


  {
    version: 6,
    statements: [
      `CREATE TABLE IF NOT EXISTS study_subjects (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        icon TEXT NOT NULL DEFAULT '📚',
        tone TEXT NOT NULL DEFAULT 'purple',
        position INTEGER NOT NULL DEFAULT 0,
        archived_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS study_materials (
        id TEXT PRIMARY KEY NOT NULL,
        subject_id TEXT NOT NULL,
        title TEXT NOT NULL,
        kind TEXT NOT NULL CHECK(kind IN ('note','pdf','image','document')),
        body_text TEXT,
        local_uri TEXT,
        mime_type TEXT,
        original_name TEXT,
        size_bytes INTEGER CHECK(size_bytes IS NULL OR size_bytes >= 0),
        progress_percent INTEGER NOT NULL DEFAULT 0 CHECK(progress_percent BETWEEN 0 AND 100),
        last_opened_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY(subject_id) REFERENCES study_subjects(id) ON DELETE RESTRICT
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS study_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        subject_id TEXT NOT NULL,
        material_id TEXT,
        status TEXT NOT NULL CHECK(status IN ('active','completed','cancelled')),
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration_seconds INTEGER CHECK(duration_seconds IS NULL OR duration_seconds >= 0),
        goal_minutes INTEGER NOT NULL DEFAULT 25 CHECK(goal_minutes BETWEEN 1 AND 240),
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(subject_id) REFERENCES study_subjects(id) ON DELETE RESTRICT,
        FOREIGN KEY(material_id) REFERENCES study_materials(id) ON DELETE SET NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS flashcards (
        id TEXT PRIMARY KEY NOT NULL,
        subject_id TEXT NOT NULL,
        material_id TEXT,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        due_at TEXT NOT NULL,
        interval_days INTEGER NOT NULL DEFAULT 0 CHECK(interval_days >= 0),
        ease_x1000 INTEGER NOT NULL DEFAULT 2500 CHECK(ease_x1000 BETWEEN 1000 AND 4000),
        repetitions INTEGER NOT NULL DEFAULT 0 CHECK(repetitions >= 0),
        status TEXT NOT NULL DEFAULT 'learning' CHECK(status IN ('learning','review','suspended')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(subject_id) REFERENCES study_subjects(id) ON DELETE RESTRICT,
        FOREIGN KEY(material_id) REFERENCES study_materials(id) ON DELETE SET NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS study_bookmarks (
        id TEXT PRIMARY KEY NOT NULL,
        material_id TEXT NOT NULL,
        title TEXT NOT NULL,
        locator_text TEXT,
        page_number INTEGER CHECK(page_number IS NULL OR page_number > 0),
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(material_id) REFERENCES study_materials(id) ON DELETE CASCADE
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS study_knowledge_chunks (
        id TEXT PRIMARY KEY NOT NULL,
        material_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL CHECK(chunk_index >= 0),
        content_text TEXT NOT NULL,
        embedding_state TEXT NOT NULL DEFAULT 'pending' CHECK(embedding_state IN ('pending','ready','failed')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(material_id, chunk_index),
        FOREIGN KEY(material_id) REFERENCES study_materials(id) ON DELETE CASCADE
      ) STRICT;`,
      `CREATE INDEX IF NOT EXISTS idx_study_materials_subject ON study_materials(subject_id, deleted_at, last_opened_at);`,
      `CREATE INDEX IF NOT EXISTS idx_study_sessions_started ON study_sessions(status, started_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_flashcards_due ON flashcards(status, due_at);`,
      `CREATE INDEX IF NOT EXISTS idx_study_bookmarks_material ON study_bookmarks(material_id, created_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_study_chunks_material ON study_knowledge_chunks(material_id, chunk_index);`,
    ],
  },


  {
    version: 7,
    statements: [
      `CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        area TEXT NOT NULL DEFAULT 'personal',
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','paused')),
        target_value INTEGER NOT NULL DEFAULT 100 CHECK(target_value > 0),
        current_value INTEGER NOT NULL DEFAULT 0 CHECK(current_value >= 0),
        unit TEXT NOT NULL DEFAULT '%',
        due_at TEXT,
        position INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS goal_milestones (
        id TEXT PRIMARY KEY NOT NULL,
        goal_id TEXT NOT NULL,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)),
        position INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS goal_progress_logs (
        id TEXT PRIMARY KEY NOT NULL,
        goal_id TEXT NOT NULL,
        value INTEGER NOT NULL CHECK(value >= 0),
        note TEXT,
        logged_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT '✓',
        context TEXT NOT NULL DEFAULT 'personal',
        frequency TEXT NOT NULL DEFAULT 'daily' CHECK(frequency IN ('daily','weekly')),
        target_per_week INTEGER NOT NULL DEFAULT 7 CHECK(target_per_week BETWEEN 1 AND 7),
        active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS habit_checkins (
        id TEXT PRIMARY KEY NOT NULL,
        habit_id TEXT NOT NULL,
        date_key TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 1 CHECK(completed IN (0,1)),
        value INTEGER NOT NULL DEFAULT 1 CHECK(value >= 0),
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(habit_id, date_key),
        FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE CASCADE
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS routines (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT '◉',
        context TEXT NOT NULL DEFAULT 'personal',
        active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS routine_steps (
        id TEXT PRIMARY KEY NOT NULL,
        routine_id TEXT NOT NULL,
        title TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        estimated_minutes INTEGER NOT NULL DEFAULT 5 CHECK(estimated_minutes >= 0),
        linked_habit_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(routine_id) REFERENCES routines(id) ON DELETE CASCADE,
        FOREIGN KEY(linked_habit_id) REFERENCES habits(id) ON DELETE SET NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS routine_runs (
        id TEXT PRIMARY KEY NOT NULL,
        routine_id TEXT NOT NULL,
        date_key TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','cancelled')),
        started_at TEXT NOT NULL,
        ended_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(routine_id) REFERENCES routines(id) ON DELETE CASCADE
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS routine_step_completions (
        run_id TEXT NOT NULL,
        step_id TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)),
        completed_at TEXT,
        updated_at TEXT NOT NULL,
        PRIMARY KEY(run_id, step_id),
        FOREIGN KEY(run_id) REFERENCES routine_runs(id) ON DELETE CASCADE,
        FOREIGN KEY(step_id) REFERENCES routine_steps(id) ON DELETE CASCADE
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS life_reviews (
        id TEXT PRIMARY KEY NOT NULL,
        review_type TEXT NOT NULL CHECK(review_type IN ('daily','weekly')),
        period_key TEXT NOT NULL,
        rating INTEGER CHECK(rating IS NULL OR rating BETWEEN 1 AND 5),
        wins TEXT NOT NULL DEFAULT '',
        friction TEXT NOT NULL DEFAULT '',
        next_focus TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(review_type, period_key)
      ) STRICT;`,
      `CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status, position);`,
      `CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal ON goal_milestones(goal_id, position);`,
      `CREATE INDEX IF NOT EXISTS idx_goal_progress_goal ON goal_progress_logs(goal_id, logged_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_habit_checkins_date ON habit_checkins(date_key, habit_id);`,
      `CREATE INDEX IF NOT EXISTS idx_routine_steps_order ON routine_steps(routine_id, position);`,
      `CREATE INDEX IF NOT EXISTS idx_routine_runs_date ON routine_runs(date_key, routine_id, status);`,
      `CREATE INDEX IF NOT EXISTS idx_life_reviews_period ON life_reviews(review_type, period_key);`,
    ],
  },


  {
    version: 8,
    statements: [
      `CREATE TABLE IF NOT EXISTS ai_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS ai_messages (
        id TEXT PRIMARY KEY NOT NULL,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
        content TEXT NOT NULL,
        provider TEXT NOT NULL CHECK(provider IN ('deterministic','llama')),
        action_type TEXT NOT NULL DEFAULT 'none',
        created_at TEXT NOT NULL,
        FOREIGN KEY(conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS ai_action_log (
        id TEXT PRIMARY KEY NOT NULL,
        conversation_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('success','failed','ignored')),
        result_text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
      ) STRICT;`,
      `CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation
        ON ai_messages(conversation_id, created_at);`,
      `CREATE INDEX IF NOT EXISTS idx_ai_action_log_conversation
        ON ai_action_log(conversation_id, created_at DESC);`,
    ],

  },

  {
    version: 9,
    statements: [
      `CREATE TABLE IF NOT EXISTS memory_documents (
        id TEXT PRIMARY KEY NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content_text TEXT NOT NULL,
        occurred_at TEXT,
        source_updated_at TEXT NOT NULL,
        embedding_json TEXT,
        embedding_dim INTEGER CHECK(embedding_dim IS NULL OR embedding_dim > 0),
        embedding_model TEXT,
        embedding_state TEXT NOT NULL DEFAULT 'pending' CHECK(embedding_state IN ('pending','ready','failed')),
        last_seen_run TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(source_type, source_id)
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS memory_index_metadata (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS memory_query_log (
        id TEXT PRIMARY KEY NOT NULL,
        query_text TEXT NOT NULL,
        retrieval_mode TEXT NOT NULL CHECK(retrieval_mode IN ('semantic','lexical')),
        result_ids_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE INDEX IF NOT EXISTS idx_memory_source
        ON memory_documents(source_type, source_id);`,
      `CREATE INDEX IF NOT EXISTS idx_memory_embedding_state
        ON memory_documents(embedding_state, updated_at);`,
      `CREATE INDEX IF NOT EXISTS idx_memory_occurred
        ON memory_documents(occurred_at DESC, source_updated_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_memory_query_created
        ON memory_query_log(created_at DESC);`,
    ],
  },

  {
    version: 10,
    statements: [
      `CREATE TABLE IF NOT EXISTS security_audit_events (
        id TEXT PRIMARY KEY NOT NULL,
        event_type TEXT NOT NULL,
        detail TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS backup_history (
        id TEXT PRIMARY KEY NOT NULL,
        operation TEXT NOT NULL CHECK(operation IN ('export','restore')),
        status TEXT NOT NULL CHECK(status IN ('success','failed')),
        file_name TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE INDEX IF NOT EXISTS idx_security_audit_created
        ON security_audit_events(created_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_backup_history_created
        ON backup_history(created_at DESC);`,
    ],
  },


  {
    version: 11,
    statements: [
      `CREATE TABLE IF NOT EXISTS app_diagnostic_events (
        id TEXT PRIMARY KEY NOT NULL,
        level TEXT NOT NULL CHECK(level IN ('info','warning','error')),
        category TEXT NOT NULL,
        message TEXT NOT NULL,
        detail TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE TABLE IF NOT EXISTS app_performance_metrics (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        duration_ms REAL NOT NULL CHECK(duration_ms >= 0),
        detail TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      ) STRICT;`,
      `CREATE INDEX IF NOT EXISTS idx_app_diagnostic_created
        ON app_diagnostic_events(created_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_app_performance_created
        ON app_performance_metrics(created_at DESC);`,
    ],
  },


  {
    version: 12,
    statements: [
      `ALTER TABLE study_materials ADD COLUMN text_extraction_state TEXT NOT NULL DEFAULT 'pending' CHECK(text_extraction_state IN ('not_applicable','pending','ready','needs_ocr','failed'));`,
      `ALTER TABLE study_materials ADD COLUMN text_extraction_error TEXT;`,
      `ALTER TABLE study_materials ADD COLUMN text_extracted_at TEXT;`,
      `ALTER TABLE study_materials ADD COLUMN text_char_count INTEGER NOT NULL DEFAULT 0 CHECK(text_char_count >= 0);`,
      `ALTER TABLE study_knowledge_chunks ADD COLUMN page_number INTEGER CHECK(page_number IS NULL OR page_number > 0);`,
      `ALTER TABLE study_knowledge_chunks ADD COLUMN source_locator TEXT;`,
      `ALTER TABLE study_knowledge_chunks ADD COLUMN extraction_method TEXT;`,
      `UPDATE study_materials SET text_extraction_state='ready',text_extracted_at=updated_at,text_char_count=LENGTH(COALESCE(body_text,'')) WHERE kind='note';`,
      `UPDATE study_materials SET text_extraction_state='needs_ocr' WHERE kind='image' AND body_text IS NULL;`,
      `UPDATE study_knowledge_chunks SET source_locator='LifeOS note',extraction_method='note' WHERE extraction_method IS NULL;`,
      `CREATE INDEX IF NOT EXISTS idx_study_material_extraction ON study_materials(text_extraction_state,updated_at);`,
      `CREATE INDEX IF NOT EXISTS idx_study_chunks_page ON study_knowledge_chunks(material_id,page_number,chunk_index);`,
    ],
  },

];

async function ensureMigrationTable() {
  await database.execute(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    ) STRICT;`,
  );
}

async function currentVersion(): Promise<number> {
  let version = 0;
  await database.transaction(async tx => {
    const result = await tx.execute(
      'SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations;',
    );
    const row = result.rows[0] as {version?: number} | undefined;
    version = Number(row?.version ?? 0);
  });
  return version;
}

export async function runMigrations() {
  await ensureMigrationTable();
  const installedVersion = await currentVersion();
  const pending = migrations.filter(item => item.version > installedVersion);

  for (const migration of pending) {
    await database.transaction(async tx => {
      for (const statement of migration.statements) {
        await tx.execute(statement);
      }
      await tx.execute(
        'INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?);',
        [migration.version, new Date().toISOString()],
      );
    });
  }
}
