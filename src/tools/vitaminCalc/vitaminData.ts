import { Constraint, RequirementConstraint } from './repository/ConstraintRepository';
import { Supplement } from './repository/SupplementRepository';

export interface VitaminDataFile {
  timestamp?: string;
  supplements: Supplement[];
  constraints: Constraint[];
  requirements: RequirementConstraint[];
}

type VitaminDataStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const storageKeys = ['supplements', 'constraints', 'requirements'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isSupplement(value: unknown): value is Supplement {
  if (!isRecord(value)) return false;

  const hasValidIngredients = Array.isArray(value.ingredients) && value.ingredients.every((ingredient) => (
    isRecord(ingredient)
    && typeof ingredient.name === 'string'
    && isFiniteNumber(ingredient.amount)
  ));

  return isFiniteNumber(value.id)
    && typeof value.name === 'string'
    && typeof value.maker === 'string'
    && (value.image === undefined || typeof value.image === 'string')
    && (value.disabled === undefined || typeof value.disabled === 'boolean')
    && hasValidIngredients;
}

function isConstraint(value: unknown): value is Constraint {
  return isRecord(value)
    && isFiniteNumber(value.id)
    && typeof value.name === 'string'
    && isFiniteNumber(value.max)
    && isFiniteNumber(value.target);
}

function isRequirement(value: unknown): value is RequirementConstraint {
  return isRecord(value)
    && isFiniteNumber(value.id)
    && isFiniteNumber(value.amount)
    && isFiniteNumber(value.supplementId);
}

function requireValidCollection<T>(
  data: Record<string, unknown>,
  key: keyof Pick<VitaminDataFile, 'supplements' | 'constraints' | 'requirements'>,
  validator: (value: unknown) => value is T,
): T[] {
  const collection = data[key];
  if (!Array.isArray(collection) || !collection.every(validator)) {
    throw new Error(`The selected file contains invalid ${key} data.`);
  }

  return collection;
}

export function parseVitaminDataFile(contents: string): VitaminDataFile {
  let parsed: unknown;

  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (!isRecord(parsed)) {
    throw new Error('The selected file is not a Vitamin Calculator data file.');
  }

  if (parsed.timestamp !== undefined && typeof parsed.timestamp !== 'string') {
    throw new Error('The selected file contains an invalid timestamp.');
  }

  const supplements = requireValidCollection(parsed, 'supplements', isSupplement);
  const constraints = requireValidCollection(parsed, 'constraints', isConstraint);
  const requirements = requireValidCollection(parsed, 'requirements', isRequirement);

  return {
    ...(parsed.timestamp === undefined ? {} : { timestamp: parsed.timestamp }),
    supplements,
    constraints,
    requirements,
  };
}

export function createVitaminDataFile(
  supplements: Supplement[],
  constraints: Constraint[],
  requirements: RequirementConstraint[],
  timestamp = new Date().toISOString(),
): VitaminDataFile {
  return { timestamp, supplements, constraints, requirements };
}

export function storeVitaminData(data: VitaminDataFile, storage: VitaminDataStorage = localStorage): void {
  const previousData = new Map(storageKeys.map((key) => [key, storage.getItem(key)]));

  try {
    storage.setItem('supplements', JSON.stringify(data.supplements));
    storage.setItem('constraints', JSON.stringify(data.constraints));
    storage.setItem('requirements', JSON.stringify(data.requirements));
  } catch (error) {
    storageKeys.forEach((key) => {
      const previousValue = previousData.get(key);
      if (previousValue === null || previousValue === undefined) {
        storage.removeItem(key);
      } else {
        storage.setItem(key, previousValue);
      }
    });
    throw error;
  }
}
