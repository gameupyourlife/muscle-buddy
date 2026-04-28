export * from './auth-schema';

import { relations } from 'drizzle-orm';
import {
    boolean,
    index,
    integer,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema';

export const test = pgTable('test', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  test: text('test'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const exerciseCatalog = pgTable(
  'exercise_catalog',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    muscleGroup: text('muscle_group').notNull(),
    equipment: text('equipment'),
    isCompound: boolean('is_compound').default(false).notNull(),
    isStarter: boolean('is_starter').default(false).notNull(),
    createdByUserId: text('created_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('exercise_catalog_slug_unique').on(table.slug),
    index('exercise_catalog_created_by_idx').on(table.createdByUserId),
    index('exercise_catalog_starter_idx').on(table.isStarter),
  ]
);

export const planTemplates = pgTable(
  'plan_template',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    difficulty: text('difficulty').notNull(),
    weeklyTarget: integer('weekly_target').notNull().default(3),
    isPublished: boolean('is_published').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('plan_template_published_idx').on(table.isPublished)]
);

export const planTemplateExercises = pgTable(
  'plan_template_exercise',
  {
    id: text('id').primaryKey(),
    templateId: text('template_id')
      .notNull()
      .references(() => planTemplates.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exerciseCatalog.id, { onDelete: 'restrict' }),
    dayOfWeek: integer('day_of_week'),
    sortOrder: integer('sort_order').notNull().default(0),
    targetSets: integer('target_sets').notNull().default(3),
    targetReps: integer('target_reps').notNull().default(10),
    targetWeight: integer('target_weight'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('plan_template_exercise_template_idx').on(table.templateId),
    index('plan_template_exercise_exercise_idx').on(table.exerciseId),
    index('plan_template_exercise_order_idx').on(table.templateId, table.sortOrder),
  ]
);

export const trainingPlans = pgTable(
  'training_plan',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    sourceTemplateId: text('source_template_id').references(() => planTemplates.id, {
      onDelete: 'set null',
    }),
    weeklyTarget: integer('weekly_target').notNull().default(3),
    isActive: boolean('is_active').notNull().default(false),
    timeZone: text('time_zone').notNull().default('UTC'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('training_plan_user_idx').on(table.userId),
    index('training_plan_active_idx').on(table.userId, table.isActive),
  ]
);

export const trainingPlanExercises = pgTable(
  'training_plan_exercise',
  {
    id: text('id').primaryKey(),
    planId: text('plan_id')
      .notNull()
      .references(() => trainingPlans.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exerciseCatalog.id, { onDelete: 'restrict' }),
    dayOfWeek: integer('day_of_week'),
    sortOrder: integer('sort_order').notNull().default(0),
    targetSets: integer('target_sets').notNull().default(3),
    targetReps: integer('target_reps').notNull().default(10),
    targetWeight: integer('target_weight'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('training_plan_exercise_plan_idx').on(table.planId),
    index('training_plan_exercise_exercise_idx').on(table.exerciseId),
    index('training_plan_exercise_order_idx').on(table.planId, table.sortOrder),
  ]
);

export const workoutSessions = pgTable(
  'workout_session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    planId: text('plan_id').references(() => trainingPlans.id, { onDelete: 'set null' }),
    status: text('status').notNull().default('in_progress'),
    source: text('source').notNull().default('manual'),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    durationMinutes: integer('duration_minutes'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('workout_session_user_idx').on(table.userId),
    index('workout_session_plan_idx').on(table.planId),
    index('workout_session_completed_idx').on(table.userId, table.completedAt),
  ]
);

export const workoutSessionSets = pgTable(
  'workout_session_set',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => workoutSessions.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exerciseCatalog.id, { onDelete: 'restrict' }),
    setNumber: integer('set_number').notNull(),
    reps: integer('reps').notNull(),
    weight: integer('weight').notNull(),
    isWarmup: boolean('is_warmup').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('workout_session_set_session_idx').on(table.sessionId),
    index('workout_session_set_exercise_idx').on(table.exerciseId),
    uniqueIndex('workout_session_set_unique_order').on(table.sessionId, table.setNumber),
  ]
);

export const userGamification = pgTable('user_gamification', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  totalXp: integer('total_xp').notNull().default(0),
  level: integer('level').notNull().default(1),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  lastQualifiedWeekKey: text('last_qualified_week_key'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const weeklyProgress = pgTable(
  'weekly_progress',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    weekKey: text('week_key').notNull(),
    weeklyTarget: integer('weekly_target').notNull(),
    completedWorkouts: integer('completed_workouts').notNull().default(0),
    qualifiedAt: timestamp('qualified_at'),
    bonusXpAwarded: boolean('bonus_xp_awarded').notNull().default(false),
    streakExtended: boolean('streak_extended').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('weekly_progress_user_week_unique').on(table.userId, table.weekKey),
    index('weekly_progress_user_idx').on(table.userId),
  ]
);

export const xpEvents = pgTable(
  'xp_event',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    sessionId: text('session_id').references(() => workoutSessions.id, {
      onDelete: 'set null',
    }),
    weekKey: text('week_key'),
    eventType: text('event_type').notNull(),
    baseXp: integer('base_xp').notNull().default(0),
    buffXp: integer('buff_xp').notNull().default(0),
    bonusXp: integer('bonus_xp').notNull().default(0),
    totalXp: integer('total_xp').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('xp_event_idempotency_unique').on(table.idempotencyKey),
    index('xp_event_user_idx').on(table.userId),
    index('xp_event_session_idx').on(table.sessionId),
  ]
);

export const foodCatalog = pgTable(
  'food_catalog',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    brand: text('brand'),
    barcode: text('barcode'),
    servingLabel: text('serving_label').notNull().default('1 serving'),
    servingQuantity: integer('serving_quantity').notNull().default(1),
    calories: integer('calories').notNull(),
    proteinGrams: integer('protein_grams').notNull(),
    carbsGrams: integer('carbs_grams').notNull(),
    fatGrams: integer('fat_grams').notNull(),
    isPublic: boolean('is_public').notNull().default(false),
    createdByUserId: text('created_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('food_catalog_name_idx').on(table.name),
    index('food_catalog_user_idx').on(table.createdByUserId),
    index('food_catalog_public_idx').on(table.isPublic),
    index('food_catalog_barcode_idx').on(table.barcode),
  ]
);

export const userNutritionGoals = pgTable('user_nutrition_goal', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  caloriesTarget: integer('calories_target').notNull(),
  proteinTarget: integer('protein_target').notNull(),
  carbsTarget: integer('carbs_target').notNull(),
  fatTarget: integer('fat_target').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const foodLogs = pgTable(
  'food_log',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    catalogFoodId: text('catalog_food_id').references(() => foodCatalog.id, {
      onDelete: 'set null',
    }),
    foodName: text('food_name').notNull(),
    mealType: text('meal_type').notNull(),
    quantity: integer('quantity').notNull().default(1),
    calories: integer('calories').notNull(),
    proteinGrams: integer('protein_grams').notNull(),
    carbsGrams: integer('carbs_grams').notNull(),
    fatGrams: integer('fat_grams').notNull(),
    notes: text('notes'),
    logDate: text('log_date').notNull(),
    loggedAt: timestamp('logged_at').defaultNow().notNull(),
    lastEditedAt: timestamp('last_edited_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('food_log_user_date_idx').on(table.userId, table.logDate),
    index('food_log_user_logged_at_idx').on(table.userId, table.loggedAt),
    index('food_log_user_meal_type_idx').on(table.userId, table.mealType),
  ]
);

export const mealTemplates = pgTable(
  'meal_template',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    mealType: text('meal_type'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('meal_template_user_idx').on(table.userId)]
);

export const mealTemplateItems = pgTable(
  'meal_template_item',
  {
    id: text('id').primaryKey(),
    templateId: text('template_id')
      .notNull()
      .references(() => mealTemplates.id, { onDelete: 'cascade' }),
    catalogFoodId: text('catalog_food_id').references(() => foodCatalog.id, {
      onDelete: 'set null',
    }),
    foodName: text('food_name').notNull(),
    quantity: integer('quantity').notNull().default(1),
    calories: integer('calories').notNull(),
    proteinGrams: integer('protein_grams').notNull(),
    carbsGrams: integer('carbs_grams').notNull(),
    fatGrams: integer('fat_grams').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('meal_template_item_template_idx').on(table.templateId),
    index('meal_template_item_food_idx').on(table.catalogFoodId),
  ]
);

export const nutritionDailyXp = pgTable(
  'nutrition_daily_xp',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    logDate: text('log_date').notNull(),
    awardedXp: integer('awarded_xp').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('nutrition_daily_xp_user_date_unique').on(table.userId, table.logDate),
    index('nutrition_daily_xp_user_idx').on(table.userId),
  ]
);

export const planTemplateRelations = relations(planTemplates, ({ many }) => ({
  exercises: many(planTemplateExercises),
  plans: many(trainingPlans),
}));

export const planTemplateExerciseRelations = relations(planTemplateExercises, ({ one }) => ({
  template: one(planTemplates, {
    fields: [planTemplateExercises.templateId],
    references: [planTemplates.id],
  }),
  exercise: one(exerciseCatalog, {
    fields: [planTemplateExercises.exerciseId],
    references: [exerciseCatalog.id],
  }),
}));

export const exerciseCatalogRelations = relations(exerciseCatalog, ({ one, many }) => ({
  createdByUser: one(user, {
    fields: [exerciseCatalog.createdByUserId],
    references: [user.id],
  }),
  templateEntries: many(planTemplateExercises),
  planEntries: many(trainingPlanExercises),
  sets: many(workoutSessionSets),
}));

export const trainingPlanRelations = relations(trainingPlans, ({ one, many }) => ({
  user: one(user, {
    fields: [trainingPlans.userId],
    references: [user.id],
  }),
  sourceTemplate: one(planTemplates, {
    fields: [trainingPlans.sourceTemplateId],
    references: [planTemplates.id],
  }),
  exercises: many(trainingPlanExercises),
  sessions: many(workoutSessions),
}));

export const trainingPlanExerciseRelations = relations(trainingPlanExercises, ({ one }) => ({
  plan: one(trainingPlans, {
    fields: [trainingPlanExercises.planId],
    references: [trainingPlans.id],
  }),
  exercise: one(exerciseCatalog, {
    fields: [trainingPlanExercises.exerciseId],
    references: [exerciseCatalog.id],
  }),
}));

export const workoutSessionRelations = relations(workoutSessions, ({ one, many }) => ({
  user: one(user, {
    fields: [workoutSessions.userId],
    references: [user.id],
  }),
  plan: one(trainingPlans, {
    fields: [workoutSessions.planId],
    references: [trainingPlans.id],
  }),
  sets: many(workoutSessionSets),
  xpEvents: many(xpEvents),
}));

export const workoutSessionSetRelations = relations(workoutSessionSets, ({ one }) => ({
  session: one(workoutSessions, {
    fields: [workoutSessionSets.sessionId],
    references: [workoutSessions.id],
  }),
  exercise: one(exerciseCatalog, {
    fields: [workoutSessionSets.exerciseId],
    references: [exerciseCatalog.id],
  }),
}));

export const userGamificationRelations = relations(userGamification, ({ one }) => ({
  user: one(user, {
    fields: [userGamification.userId],
    references: [user.id],
  }),
}));

export const weeklyProgressRelations = relations(weeklyProgress, ({ one }) => ({
  user: one(user, {
    fields: [weeklyProgress.userId],
    references: [user.id],
  }),
}));

export const xpEventRelations = relations(xpEvents, ({ one }) => ({
  user: one(user, {
    fields: [xpEvents.userId],
    references: [user.id],
  }),
  session: one(workoutSessions, {
    fields: [xpEvents.sessionId],
    references: [workoutSessions.id],
  }),
}));

export const foodCatalogRelations = relations(foodCatalog, ({ one, many }) => ({
  createdByUser: one(user, {
    fields: [foodCatalog.createdByUserId],
    references: [user.id],
  }),
  logs: many(foodLogs),
  templateItems: many(mealTemplateItems),
}));

export const userNutritionGoalsRelations = relations(userNutritionGoals, ({ one }) => ({
  user: one(user, {
    fields: [userNutritionGoals.userId],
    references: [user.id],
  }),
}));

export const foodLogsRelations = relations(foodLogs, ({ one }) => ({
  user: one(user, {
    fields: [foodLogs.userId],
    references: [user.id],
  }),
  catalogFood: one(foodCatalog, {
    fields: [foodLogs.catalogFoodId],
    references: [foodCatalog.id],
  }),
}));

export const mealTemplatesRelations = relations(mealTemplates, ({ one, many }) => ({
  user: one(user, {
    fields: [mealTemplates.userId],
    references: [user.id],
  }),
  items: many(mealTemplateItems),
}));

export const mealTemplateItemsRelations = relations(mealTemplateItems, ({ one }) => ({
  template: one(mealTemplates, {
    fields: [mealTemplateItems.templateId],
    references: [mealTemplates.id],
  }),
  catalogFood: one(foodCatalog, {
    fields: [mealTemplateItems.catalogFoodId],
    references: [foodCatalog.id],
  }),
}));

export const nutritionDailyXpRelations = relations(nutritionDailyXp, ({ one }) => ({
  user: one(user, {
    fields: [nutritionDailyXp.userId],
    references: [user.id],
  }),
}));