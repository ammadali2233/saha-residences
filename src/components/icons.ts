// Lucide icons (ISC), inlined at build time so no icon CDN is ever requested (CLAUDE.md).
// Add an icon by importing its raw SVG here.
import airVent from 'lucide-static/icons/air-vent.svg?raw';
import arrowRight from 'lucide-static/icons/arrow-right.svg?raw';
import ban from 'lucide-static/icons/ban.svg?raw';
import bath from 'lucide-static/icons/bath.svg?raw';
import bedDouble from 'lucide-static/icons/bed-double.svg?raw';
import calendar from 'lucide-static/icons/calendar.svg?raw';
import car from 'lucide-static/icons/car.svg?raw';
import cctv from 'lucide-static/icons/cctv.svg?raw';
import check from 'lucide-static/icons/check.svg?raw';
import chevronDown from 'lucide-static/icons/chevron-down.svg?raw';
import chevronLeft from 'lucide-static/icons/chevron-left.svg?raw';
import chevronRight from 'lucide-static/icons/chevron-right.svg?raw';
import clock from 'lucide-static/icons/clock.svg?raw';
import cookingPot from 'lucide-static/icons/cooking-pot.svg?raw';
import gamepad2 from 'lucide-static/icons/gamepad-2.svg?raw';
import idCard from 'lucide-static/icons/id-card.svg?raw';
import image from 'lucide-static/icons/image.svg?raw';
import laptop from 'lucide-static/icons/laptop.svg?raw';
import mapPin from 'lucide-static/icons/map-pin.svg?raw';
import menu from 'lucide-static/icons/menu.svg?raw';
import messageCircle from 'lucide-static/icons/message-circle.svg?raw';
import minus from 'lucide-static/icons/minus.svg?raw';
import phone from 'lucide-static/icons/phone.svg?raw';
import play from 'lucide-static/icons/play.svg?raw';
import plus from 'lucide-static/icons/plus.svg?raw';
import receipt from 'lucide-static/icons/receipt.svg?raw';
import shieldCheck from 'lucide-static/icons/shield-check.svg?raw';
import sun from 'lucide-static/icons/sun.svg?raw';
import userCheck from 'lucide-static/icons/user-check.svg?raw';
import users from 'lucide-static/icons/users.svg?raw';
import volumeX from 'lucide-static/icons/volume-x.svg?raw';
import wifi from 'lucide-static/icons/wifi.svg?raw';
import x from 'lucide-static/icons/x.svg?raw';

const RAW = {
  'air-vent': airVent,
  'arrow-right': arrowRight,
  ban,
  bath,
  'bed-double': bedDouble,
  calendar,
  car,
  cctv,
  check,
  'chevron-down': chevronDown,
  'chevron-left': chevronLeft,
  'chevron-right': chevronRight,
  clock,
  'cooking-pot': cookingPot,
  'gamepad-2': gamepad2,
  'id-card': idCard,
  image,
  laptop,
  'map-pin': mapPin,
  menu,
  'message-circle': messageCircle,
  minus,
  phone,
  play,
  plus,
  receipt,
  'shield-check': shieldCheck,
  sun,
  'user-check': userCheck,
  users,
  'volume-x': volumeX,
  wifi,
  x,
} as const;

export type IconName = keyof typeof RAW;

/** Inner SVG markup (paths, circles) without the wrapper or licence comment. */
export function iconBody(name: IconName): string {
  return RAW[name].replace(/<!--[\s\S]*?-->/, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
}
