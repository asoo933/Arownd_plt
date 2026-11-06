/**
 * كل مجموعات القاموس — تُدمج في `src/lib/i18n.ts`.
 * كل مجموعة يجب أن تحتوي نفس المفاتيح في `ar` و`en` (فحص آلي: i18n-parity).
 */
import type { DictGroup } from "./types";
import { shared } from "./shared";
import { home } from "./home";
import { explore } from "./explore";
import { product } from "./product";
import { commerce } from "./commerce";
import { ui } from "./ui";
import { studio } from "./studio";
import { pages } from "./pages";
import { delivery } from "./delivery";
import { activity } from "./activity";

export const GROUPS: DictGroup[] = [shared, home, explore, product, commerce, ui, studio, pages, delivery, activity];
