import { and, asc, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
    foodCatalog,
    foodLogs,
    mealTemplateItems,
    mealTemplates,
    nutritionDailyXp,
    userGamification,
    userNutritionGoals,
    xpEvents,
} from '@/lib/db/schema';
import {
    calculateMacroAdherence,
    calculateNutritionXp,
    getLocalDateKey,
    isMealType,
    type MealType,
    type NutritionGoals,
    type NutritionTotals,
} from '@/lib/workouts/nutrition';
import { getLevelFromXp } from '@/lib/workouts/utils';

export type FoodCatalogRow = typeof foodCatalog.$inferSelect;
export type FoodLogRow = typeof foodLogs.$inferSelect;
export type MealTemplateRow = typeof mealTemplates.$inferSelect;
export type MealTemplateItemRow = typeof mealTemplateItems.$inferSelect;

export type CreateFoodLogInput = {
  catalogFoodId?: string | null;
  foodName: string;
  mealType: MealType;
  quantity: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  notes?: string | null;
  logDate?: string;
  loggedAt?: string;
};

export type UpdateFoodLogInput = Partial<CreateFoodLogInput>;

export type DailyNutritionSummary = {
  logDate: string;
  goals: NutritionGoals | null;
  totals: NutritionTotals;
  adherence: {
    protein: number;
    carbs: number;
    fat: number;
    score: number;
  } | null;
  nutritionXpAwarded: number;
  nutritionXpPotential: number;
};

export type NutritionTrendPoint = {
  logDate: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  adherenceScore: number | null;
};

export type CatalogSearchResult = {
  foods: FoodCatalogRow[];
  page: number;
  pageSize: number;
};

export type CreateMealTemplateInput = {
  name: string;
  mealType?: MealType;
  items: Array<{
    catalogFoodId?: string | null;
    foodName: string;
    quantity: number;
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    sortOrder?: number;
  }>;
};

function createId() {
  return crypto.randomUUID();
}

function clampNonNegativeInt(value: number, fallback = 0) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.round(value));
}

function normalizeLogDate(logDate: string | undefined, timeZone: string) {
  if (logDate) {
    return logDate;
  }

  return getLocalDateKey(new Date(), timeZone);
}

function normalizeQuantity(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.round(value as number));
}

function mapOpenFoodFactsProduct(product: Record<string, unknown>) {
  const nutriments = (product.nutriments as Record<string, unknown> | undefined) ?? {};

  const name =
    (typeof product.product_name === 'string' && product.product_name.trim()) ||
    (typeof product.generic_name === 'string' && product.generic_name.trim()) ||
    null;

  if (!name) {
    return null;
  }

  const per100gCalories = Number(nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal']);
  const per100gProtein = Number(nutriments.proteins_100g ?? nutriments.proteins);
  const per100gCarbs = Number(nutriments.carbohydrates_100g ?? nutriments.carbohydrates);
  const per100gFat = Number(nutriments.fat_100g ?? nutriments.fat);

  if (
    !Number.isFinite(per100gCalories) ||
    !Number.isFinite(per100gProtein) ||
    !Number.isFinite(per100gCarbs) ||
    !Number.isFinite(per100gFat)
  ) {
    return null;
  }

  return {
    name,
    brand:
      typeof product.brands === 'string' && product.brands.trim().length > 0
        ? product.brands.trim()
        : null,
    barcode:
      typeof product.code === 'string' && product.code.trim().length > 0
        ? product.code.trim()
        : null,
    servingLabel: '100 g',
    servingQuantity: 1,
    calories: clampNonNegativeInt(per100gCalories),
    proteinGrams: clampNonNegativeInt(per100gProtein),
    carbsGrams: clampNonNegativeInt(per100gCarbs),
    fatGrams: clampNonNegativeInt(per100gFat),
  };
}

export async function getNutritionGoals(userId: string) {
  return db.query.userNutritionGoals.findFirst({
    where: eq(userNutritionGoals.userId, userId),
  });
}

export async function upsertNutritionGoals(userId: string, goals: NutritionGoals) {
  await db
    .insert(userNutritionGoals)
    .values({
      userId,
      caloriesTarget: clampNonNegativeInt(goals.caloriesTarget),
      proteinTarget: clampNonNegativeInt(goals.proteinTarget),
      carbsTarget: clampNonNegativeInt(goals.carbsTarget),
      fatTarget: clampNonNegativeInt(goals.fatTarget),
    })
    .onConflictDoUpdate({
      target: userNutritionGoals.userId,
      set: {
        caloriesTarget: clampNonNegativeInt(goals.caloriesTarget),
        proteinTarget: clampNonNegativeInt(goals.proteinTarget),
        carbsTarget: clampNonNegativeInt(goals.carbsTarget),
        fatTarget: clampNonNegativeInt(goals.fatTarget),
        updatedAt: new Date(),
      },
    });

  return getNutritionGoals(userId);
}

export async function searchFoodCatalog(
  userId: string,
  query: string,
  page: number,
  pageSize: number
): Promise<CatalogSearchResult> {
  const normalizedPage = Math.max(1, Math.floor(page));
  const normalizedPageSize = Math.min(50, Math.max(1, Math.floor(pageSize)));
  const trimmedQuery = query.trim();

  const foods = await db.query.foodCatalog.findMany({
    where: and(
      or(eq(foodCatalog.isPublic, true), eq(foodCatalog.createdByUserId, userId)),
      trimmedQuery.length > 0
        ? or(
            ilike(foodCatalog.name, `%${trimmedQuery}%`),
            ilike(foodCatalog.brand, `%${trimmedQuery}%`),
            ilike(foodCatalog.barcode, `%${trimmedQuery}%`)
          )
        : undefined
    ),
    orderBy: [desc(foodCatalog.isPublic), asc(foodCatalog.name)],
    limit: normalizedPageSize,
    offset: (normalizedPage - 1) * normalizedPageSize,
  });

  return {
    foods,
    page: normalizedPage,
    pageSize: normalizedPageSize,
  };
}

export async function createFoodCatalogItem(input: {
  userId: string;
  name: string;
  brand?: string | null;
  barcode?: string | null;
  servingLabel?: string;
  servingQuantity?: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}) {
  const id = createId();

  const inserted = await db
    .insert(foodCatalog)
    .values({
      id,
      name: input.name.trim(),
      brand: input.brand?.trim() || null,
      barcode: input.barcode?.trim() || null,
      servingLabel: input.servingLabel?.trim() || '1 serving',
      servingQuantity: normalizeQuantity(input.servingQuantity),
      calories: clampNonNegativeInt(input.calories),
      proteinGrams: clampNonNegativeInt(input.proteinGrams),
      carbsGrams: clampNonNegativeInt(input.carbsGrams),
      fatGrams: clampNonNegativeInt(input.fatGrams),
      isPublic: false,
      createdByUserId: input.userId,
    })
    .returning();

  return inserted[0] ?? null;
}

export async function lookupFoodByBarcode(userId: string, barcode: string) {
  const cleanBarcode = barcode.trim();

  if (!cleanBarcode) {
    return null;
  }

  const localMatch = await db.query.foodCatalog.findFirst({
    where: and(
      eq(foodCatalog.barcode, cleanBarcode),
      or(eq(foodCatalog.isPublic, true), eq(foodCatalog.createdByUserId, userId))
    ),
  });

  if (localMatch) {
    return {
      source: 'local' as const,
      food: localMatch,
    };
  }

  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json`
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json().catch(() => null)) as
    | {
        product?: Record<string, unknown>;
      }
    | null;

  if (!data?.product) {
    return null;
  }

  const mapped = mapOpenFoodFactsProduct(data.product);

  if (!mapped) {
    return null;
  }

  return {
    source: 'openfoodfacts' as const,
    food: mapped,
  };
}

export async function listFoodLogsByDate(userId: string, logDate: string) {
  return db.query.foodLogs.findMany({
    where: and(eq(foodLogs.userId, userId), eq(foodLogs.logDate, logDate)),
    orderBy: [desc(foodLogs.loggedAt)],
  });
}

export async function listRecentFoods(userId: string, limit = 8) {
  const logs = await db.query.foodLogs.findMany({
    where: eq(foodLogs.userId, userId),
    orderBy: [desc(foodLogs.loggedAt)],
    limit: Math.max(1, Math.min(50, limit * 6)),
  });

  const deduped: FoodLogRow[] = [];
  const seen = new Set<string>();

  for (const entry of logs) {
    const key = `${entry.foodName.toLowerCase()}::${entry.calories}::${entry.proteinGrams}::${entry.carbsGrams}::${entry.fatGrams}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(entry);

    if (deduped.length >= limit) {
      break;
    }
  }

  return deduped;
}

export async function createFoodLog(userId: string, input: CreateFoodLogInput, timeZone: string) {
  const id = createId();
  const logDate = normalizeLogDate(input.logDate, timeZone);

  const inserted = await db
    .insert(foodLogs)
    .values({
      id,
      userId,
      catalogFoodId: input.catalogFoodId ?? null,
      foodName: input.foodName.trim(),
      mealType: input.mealType,
      quantity: normalizeQuantity(input.quantity),
      calories: clampNonNegativeInt(input.calories),
      proteinGrams: clampNonNegativeInt(input.proteinGrams),
      carbsGrams: clampNonNegativeInt(input.carbsGrams),
      fatGrams: clampNonNegativeInt(input.fatGrams),
      notes: input.notes?.trim() || null,
      logDate,
      loggedAt: input.loggedAt ? new Date(input.loggedAt) : new Date(),
      lastEditedAt: new Date(),
    })
    .returning();

  return inserted[0] ?? null;
}

export async function listMealTemplates(userId: string) {
  return db.query.mealTemplates.findMany({
    where: eq(mealTemplates.userId, userId),
    orderBy: [desc(mealTemplates.updatedAt)],
    with: {
      items: {
        orderBy: [asc(mealTemplateItems.sortOrder)],
      },
    },
  });
}

export async function createMealTemplate(userId: string, input: CreateMealTemplateInput) {
  const templateId = createId();
  const validMealType = input.mealType && isMealType(input.mealType) ? input.mealType : null;

  await db.transaction(async (tx) => {
    await tx.insert(mealTemplates).values({
      id: templateId,
      userId,
      name: input.name.trim(),
      mealType: validMealType,
    });

    if (input.items.length > 0) {
      await tx.insert(mealTemplateItems).values(
        input.items.map((item, index) => ({
          id: createId(),
          templateId,
          catalogFoodId: item.catalogFoodId ?? null,
          foodName: item.foodName.trim(),
          quantity: normalizeQuantity(item.quantity),
          calories: clampNonNegativeInt(item.calories),
          proteinGrams: clampNonNegativeInt(item.proteinGrams),
          carbsGrams: clampNonNegativeInt(item.carbsGrams),
          fatGrams: clampNonNegativeInt(item.fatGrams),
          sortOrder: item.sortOrder ?? index,
        }))
      );
    }
  });

  return db.query.mealTemplates.findFirst({
    where: and(eq(mealTemplates.id, templateId), eq(mealTemplates.userId, userId)),
    with: {
      items: {
        orderBy: [asc(mealTemplateItems.sortOrder)],
      },
    },
  });
}

export async function applyMealTemplate(input: {
  userId: string;
  templateId: string;
  logDate?: string;
  mealType?: MealType;
  timeZone: string;
}) {
  const template = await db.query.mealTemplates.findFirst({
    where: and(eq(mealTemplates.id, input.templateId), eq(mealTemplates.userId, input.userId)),
    with: {
      items: {
        orderBy: [asc(mealTemplateItems.sortOrder)],
      },
    },
  });

  if (!template) {
    return null;
  }

  const resolvedMealType =
    (input.mealType && isMealType(input.mealType) ? input.mealType : null) ??
    (template.mealType && isMealType(template.mealType) ? template.mealType : 'snack');

  const logDate = normalizeLogDate(input.logDate, input.timeZone);
  const now = new Date();

  const inserted = await db
    .insert(foodLogs)
    .values(
      template.items.map((item) => ({
        id: createId(),
        userId: input.userId,
        catalogFoodId: item.catalogFoodId,
        foodName: item.foodName,
        mealType: resolvedMealType,
        quantity: item.quantity,
        calories: item.calories,
        proteinGrams: item.proteinGrams,
        carbsGrams: item.carbsGrams,
        fatGrams: item.fatGrams,
        notes: `From template: ${template.name}`,
        logDate,
        loggedAt: now,
        lastEditedAt: now,
      }))
    )
    .returning();

  return {
    template,
    inserted,
    logDate,
  };
}

export async function updateFoodLog(userId: string, logId: string, input: UpdateFoodLogInput, timeZone: string) {
  const existing = await db.query.foodLogs.findFirst({
    where: and(eq(foodLogs.id, logId), eq(foodLogs.userId, userId)),
  });

  if (!existing) {
    return null;
  }

  const updateValues: Partial<typeof foodLogs.$inferInsert> = {
    lastEditedAt: new Date(),
    updatedAt: new Date(),
  };

  if (typeof input.catalogFoodId !== 'undefined') {
    updateValues.catalogFoodId = input.catalogFoodId;
  }

  if (typeof input.foodName === 'string' && input.foodName.trim().length > 0) {
    updateValues.foodName = input.foodName.trim();
  }

  if (typeof input.mealType === 'string') {
    updateValues.mealType = input.mealType;
  }

  if (typeof input.quantity !== 'undefined') {
    updateValues.quantity = normalizeQuantity(input.quantity);
  }

  if (typeof input.calories !== 'undefined') {
    updateValues.calories = clampNonNegativeInt(input.calories);
  }

  if (typeof input.proteinGrams !== 'undefined') {
    updateValues.proteinGrams = clampNonNegativeInt(input.proteinGrams);
  }

  if (typeof input.carbsGrams !== 'undefined') {
    updateValues.carbsGrams = clampNonNegativeInt(input.carbsGrams);
  }

  if (typeof input.fatGrams !== 'undefined') {
    updateValues.fatGrams = clampNonNegativeInt(input.fatGrams);
  }

  if (typeof input.notes !== 'undefined') {
    updateValues.notes = input.notes?.trim() || null;
  }

  if (typeof input.logDate !== 'undefined') {
    updateValues.logDate = normalizeLogDate(input.logDate, timeZone);
  }

  const updatedRows = await db
    .update(foodLogs)
    .set(updateValues)
    .where(and(eq(foodLogs.id, logId), eq(foodLogs.userId, userId)))
    .returning();

  return updatedRows[0] ?? null;
}

export async function deleteFoodLog(userId: string, logId: string) {
  const deletedRows = await db
    .delete(foodLogs)
    .where(and(eq(foodLogs.id, logId), eq(foodLogs.userId, userId)))
    .returning({ id: foodLogs.id });

  return deletedRows.length > 0;
}

async function awardNutritionXpIfNeeded(userId: string, logDate: string, adherenceScore: number) {
  const targetXp = calculateNutritionXp(adherenceScore);

  return db.transaction(async (tx) => {
    await tx
      .insert(userGamification)
      .values({
        userId,
        totalXp: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
      })
      .onConflictDoNothing();

    const existingAward = await tx.query.nutritionDailyXp.findFirst({
      where: and(eq(nutritionDailyXp.userId, userId), eq(nutritionDailyXp.logDate, logDate)),
    });

    const alreadyAwarded = existingAward?.awardedXp ?? 0;

    if (targetXp <= alreadyAwarded) {
      return alreadyAwarded;
    }

    const delta = targetXp - alreadyAwarded;
    const idempotencyKey = `nutrition-daily:${userId}:${logDate}:${targetXp}`;

    const insertedEvents = await tx
      .insert(xpEvents)
      .values({
        id: createId(),
        userId,
        sessionId: null,
        weekKey: null,
        eventType: 'nutrition_daily',
        baseXp: 0,
        buffXp: 0,
        bonusXp: delta,
        totalXp: delta,
        idempotencyKey,
      })
      .onConflictDoNothing()
      .returning({ id: xpEvents.id });

    if (insertedEvents.length === 0) {
      return alreadyAwarded;
    }

    await tx
      .insert(nutritionDailyXp)
      .values({
        id: createId(),
        userId,
        logDate,
        awardedXp: targetXp,
      })
      .onConflictDoUpdate({
        target: [nutritionDailyXp.userId, nutritionDailyXp.logDate],
        set: {
          awardedXp: targetXp,
          updatedAt: new Date(),
        },
      });

    const state = await tx.query.userGamification.findFirst({
      where: eq(userGamification.userId, userId),
    });

    const totalXp = (state?.totalXp ?? 0) + delta;

    await tx
      .update(userGamification)
      .set({
        totalXp,
        level: getLevelFromXp(totalXp),
        updatedAt: new Date(),
      })
      .where(eq(userGamification.userId, userId));

    return targetXp;
  });
}

export async function getDailyNutritionSummary(
  userId: string,
  logDate: string,
  options?: { awardXp?: boolean }
): Promise<DailyNutritionSummary> {
  const [totalsRow] = await db
    .select({
      calories: sql<number>`COALESCE(SUM(${foodLogs.calories} * ${foodLogs.quantity}), 0)`,
      proteinGrams: sql<number>`COALESCE(SUM(${foodLogs.proteinGrams} * ${foodLogs.quantity}), 0)`,
      carbsGrams: sql<number>`COALESCE(SUM(${foodLogs.carbsGrams} * ${foodLogs.quantity}), 0)`,
      fatGrams: sql<number>`COALESCE(SUM(${foodLogs.fatGrams} * ${foodLogs.quantity}), 0)`,
    })
    .from(foodLogs)
    .where(and(eq(foodLogs.userId, userId), eq(foodLogs.logDate, logDate)));

  const goals = await getNutritionGoals(userId);
  const totals: NutritionTotals = {
    calories: Number(totalsRow?.calories ?? 0),
    proteinGrams: Number(totalsRow?.proteinGrams ?? 0),
    carbsGrams: Number(totalsRow?.carbsGrams ?? 0),
    fatGrams: Number(totalsRow?.fatGrams ?? 0),
  };

  let adherence: DailyNutritionSummary['adherence'] = null;
  let potentialXp = 0;

  if (goals) {
    adherence = calculateMacroAdherence(totals, {
      caloriesTarget: goals.caloriesTarget,
      proteinTarget: goals.proteinTarget,
      carbsTarget: goals.carbsTarget,
      fatTarget: goals.fatTarget,
    });

    potentialXp = calculateNutritionXp(adherence.score);
  }

  const existingAward = await db.query.nutritionDailyXp.findFirst({
    where: and(eq(nutritionDailyXp.userId, userId), eq(nutritionDailyXp.logDate, logDate)),
  });

  let nutritionXpAwarded = existingAward?.awardedXp ?? 0;

  if (options?.awardXp && adherence) {
    nutritionXpAwarded = await awardNutritionXpIfNeeded(userId, logDate, adherence.score);
  }

  return {
    logDate,
    goals: goals
      ? {
          caloriesTarget: goals.caloriesTarget,
          proteinTarget: goals.proteinTarget,
          carbsTarget: goals.carbsTarget,
          fatTarget: goals.fatTarget,
        }
      : null,
    totals,
    adherence,
    nutritionXpAwarded,
    nutritionXpPotential: potentialXp,
  };
}

export async function listNutritionTrends(userId: string, endLogDate: string, days = 7) {
  const safeDays = Math.max(1, Math.min(30, Math.floor(days)));
  const endDate = new Date(`${endLogDate}T00:00:00.000Z`);

  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - (safeDays - 1));

  const startKey = `${startDate.getUTCFullYear()}-${String(startDate.getUTCMonth() + 1).padStart(2, '0')}-${String(startDate.getUTCDate()).padStart(2, '0')}`;

  const logs = await db.query.foodLogs.findMany({
    where: and(
      eq(foodLogs.userId, userId),
      gte(foodLogs.logDate, startKey),
      lte(foodLogs.logDate, endLogDate)
    ),
    orderBy: [asc(foodLogs.logDate), asc(foodLogs.loggedAt)],
  });

  const goals = await getNutritionGoals(userId);
  const bucket = new Map<string, NutritionTotals>();

  for (const entry of logs) {
    const current = bucket.get(entry.logDate) ?? {
      calories: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
    };

    current.calories += entry.calories * entry.quantity;
    current.proteinGrams += entry.proteinGrams * entry.quantity;
    current.carbsGrams += entry.carbsGrams * entry.quantity;
    current.fatGrams += entry.fatGrams * entry.quantity;
    bucket.set(entry.logDate, current);
  }

  const points: NutritionTrendPoint[] = [];

  for (let index = 0; index < safeDays; index += 1) {
    const pointDate = new Date(startDate);
    pointDate.setUTCDate(startDate.getUTCDate() + index);
    const key = `${pointDate.getUTCFullYear()}-${String(pointDate.getUTCMonth() + 1).padStart(2, '0')}-${String(pointDate.getUTCDate()).padStart(2, '0')}`;

    const totals = bucket.get(key) ?? {
      calories: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
    };

    const adherenceScore = goals
      ? calculateMacroAdherence(totals, {
          caloriesTarget: goals.caloriesTarget,
          proteinTarget: goals.proteinTarget,
          carbsTarget: goals.carbsTarget,
          fatTarget: goals.fatTarget,
        }).score
      : null;

    points.push({
      logDate: key,
      ...totals,
      adherenceScore,
    });
  }

  return points;
}

export function resolveLogDateFromRequest(logDate: string | null, timeZone: string) {
  if (logDate && logDate.trim().length > 0) {
    return logDate;
  }

  return getLocalDateKey(new Date(), timeZone);
}

export function resolveTimeZone(inputTimeZone: string | null | undefined) {
  if (inputTimeZone && inputTimeZone.trim().length > 0) {
    return inputTimeZone;
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
