export type MealKey = "breakfast" | "lunch" | "snacks" | "dinner";

export type MealSlot = {
  key: MealKey;
  name: string;
  shortName: string;
  orderOpen: [number, number];
  cutoff: [number, number];
  delivery: string;
  cutoffLabel: string;
};

export const MEAL_SLOTS: MealSlot[] = [
  {
    key: "breakfast",
    name: "Breakfast",
    shortName: "Breakfast",
    orderOpen: [18, 0],
    cutoff: [7, 0],
    delivery: "7:30–9:30 AM",
    cutoffLabel: "7:00 AM",
  },
  {
    key: "lunch",
    name: "Lunch",
    shortName: "Lunch",
    orderOpen: [8, 0],
    cutoff: [11, 0],
    delivery: "12:30–2:00 PM",
    cutoffLabel: "11:00 AM",
  },
  {
    key: "snacks",
    name: "Evening snacks",
    shortName: "Snacks",
    orderOpen: [12, 0],
    cutoff: [16, 0],
    delivery: "4:30–6:00 PM",
    cutoffLabel: "4:00 PM",
  },
  {
    key: "dinner",
    name: "Dinner",
    shortName: "Dinner",
    orderOpen: [15, 0],
    cutoff: [19, 30],
    delivery: "7:30–9:30 PM",
    cutoffLabel: "7:30 PM",
  },
];

const IST_OFFSET_MS = 330 * 60 * 1000;

function istCalendar(nowMs: number) {
  const shifted = new Date(nowMs + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

function pseudoTimestamp(
  calendar: ReturnType<typeof istCalendar>,
  hour: number,
  minute: number,
  dayOffset = 0,
) {
  return Date.UTC(
    calendar.year,
    calendar.month,
    calendar.day + dayOffset,
    hour,
    minute,
  );
}

export type SlotState = MealSlot & {
  state: "open" | "upcoming" | "locked";
  openAt: number;
  cutoffAt: number;
  targetAt: number;
  dayOffset: number;
};

export function getSlotStates(nowMs = Date.now()): SlotState[] {
  const calendar = istCalendar(nowMs);
  const nowPseudo = nowMs + IST_OFFSET_MS;

  return MEAL_SLOTS.map((slot) => {
    const opensPreviousDay = slot.key === "breakfast";
    const openAt = pseudoTimestamp(
      calendar,
      slot.orderOpen[0],
      slot.orderOpen[1],
      opensPreviousDay ? -1 : 0,
    );
    const cutoffAt = pseudoTimestamp(
      calendar,
      slot.cutoff[0],
      slot.cutoff[1],
    );

    const state =
      nowPseudo < openAt
        ? "upcoming"
        : nowPseudo < cutoffAt
          ? "open"
          : "locked";

    return {
      ...slot,
      state,
      openAt,
      cutoffAt,
      targetAt: state === "upcoming" ? openAt : cutoffAt,
      dayOffset: 0,
    };
  });
}

export function getPrimarySession(nowMs = Date.now()): SlotState {
  const today = getSlotStates(nowMs);
  const open = today
    .filter((slot) => slot.state === "open")
    .sort((a, b) => a.cutoffAt - b.cutoffAt)[0];
  if (open) return open;

  const upcoming = today
    .filter((slot) => slot.state === "upcoming")
    .sort((a, b) => a.openAt - b.openAt)[0];
  if (upcoming) return upcoming;

  const calendar = istCalendar(nowMs);
  const breakfast = MEAL_SLOTS[0];
  const openAt = pseudoTimestamp(
    calendar,
    breakfast.orderOpen[0],
    breakfast.orderOpen[1],
    0,
  );
  const cutoffAt = pseudoTimestamp(
    calendar,
    breakfast.cutoff[0],
    breakfast.cutoff[1],
    1,
  );
  return {
    ...breakfast,
    state: "upcoming",
    openAt,
    cutoffAt,
    targetAt: openAt,
    dayOffset: 1,
  };
}

export function formatCountdown(targetPseudo: number, nowMs = Date.now()) {
  const nowPseudo = nowMs + IST_OFFSET_MS;
  const totalSeconds = Math.max(0, Math.floor((targetPseudo - nowPseudo) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}
