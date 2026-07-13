/**
 * Every composed Bear Cafe spoken line, as pure builders — shared by the
 * activity runtime AND the voice-pack manifest collector so the Emma pack
 * can enumerate exactly what the game can say.
 */

import type { BearCafeContent, BearCafeRequiredOrder } from './kennedis-orders.types';

export function getFixFeedback(
  content: BearCafeContent,
  issue: string,
  attemptNumber: number
): string {
  if (attemptNumber < 2) return "Let's check the order.";

  const required = content.required_order;
  switch (issue) {
    case 'quantity_under':
    case 'quantity_over':
      return `${content.character.name} asked for ${getRequestedQuantity(required) ?? 'more'}. Let's count.`;
    case 'color': {
      const colorLabel = content.colors?.find((color) => (
        color.id === required?.color_id
      ))?.label ?? 'that color';
      return `${content.character.name} wanted ${colorLabel}.`;
    }
    case 'first_sound_sort':
      return 'Bear starts with b-b-b. Banana starts with b-b-b.';
    case 'food':
      return `${content.character.name} asked for ${getCorrectAnswer(content)}.`;
    case 'food_removed':
      return "That one belongs in the order.";
    default:
      return 'You can fix it.';
  }
}

export function getCorrectAnswer(content: BearCafeContent): string {
  const required = content.required_order;
  if (!required) return 'any snack';

  if (required.food_counts) {
    return Object.entries(required.food_counts)
      .filter(([, count]) => count > 0)
      .map(([foodId, count]) => {
        const label = getFoodLabel(content, foodId);
        return count > 1 ? `${count} ${label}` : label;
      })
      .join(', ');
  }

  if (required.food_ids) {
    return required.food_ids.map((foodId) => getFoodLabel(content, foodId)).join(', ');
  }

  const parts = [];
  if (typeof required.quantity === 'number') parts.push(String(required.quantity));
  if (required.color_id) {
    const colorLabel = content.colors?.find((entry) => entry.id === required.color_id)?.label;
    parts.push(colorLabel ?? required.color_id);
  }
  if (required.food_id) parts.push(getFoodLabel(content, required.food_id));
  return parts.join(' ');
}

export function getRequestedQuantity(required: BearCafeRequiredOrder | undefined): number | undefined {
  if (!required) return undefined;
  if (typeof required.quantity === 'number') return required.quantity;
  if (required.food_counts) {
    return Object.values(required.food_counts).reduce((sum, count) => sum + count, 0);
  }
  if (required.food_ids) return required.food_ids.length;
  return undefined;
}

export function getFoodLabel(content: BearCafeContent, foodId: string | undefined): string {
  if (!foodId) return 'food';
  return content.foods.find((food) => food.id === foodId)?.label ?? foodId;
}
