import type { AppLanguage } from '@/i18n';
import { BackupPayload, type AppList, type AppSettings, type Task } from '@/types/domain';
import { addDays, setTimeOnDate, startOfDay } from '@/utils/date';

type ScreenshotFixtureCopy = {
  language: AppLanguage;
  lists: {
    focus: string;
    home: string;
    health: string;
  };
  tasks: {
    quarterlyReview: string;
    productPolish: string;
    planWeek: string;
    payRent: string;
    buyFruit: string;
    waterPlants: string;
    gym: string;
    mealPrep: string;
    dentist: string;
  };
  descriptions: {
    quarterlyReview: string;
    productPolish: string;
    planWeek: string;
    payRent: string;
    waterPlants: string;
    mealPrep: string;
    dentist: string;
  };
};

export const screenshotFixtureIds = {
  lists: {
    focus: 'screenshot-list-focus',
    home: 'screenshot-list-home',
    health: 'screenshot-list-health'
  },
  tasks: {
    quarterlyReview: 'screenshot-task-quarterly-review',
    productPolish: 'screenshot-task-product-polish',
    planWeek: 'screenshot-task-plan-week',
    payRent: 'screenshot-task-pay-rent',
    buyFruit: 'screenshot-task-buy-fruit',
    waterPlants: 'screenshot-task-water-plants',
    gym: 'screenshot-task-gym',
    mealPrep: 'screenshot-task-meal-prep',
    dentist: 'screenshot-task-dentist'
  }
} as const;

export type ScreenshotSeedScreen = 'home' | 'calendar' | 'list-detail' | 'task-detail';

export function resolveScreenshotSeedDestination(screen?: string | null): string {
  const normalized = (screen ?? '').trim().toLowerCase();

  switch (normalized) {
    case 'calendar':
      return '/(tabs)/calendar';
    case 'list-detail':
      return `/lists/${screenshotFixtureIds.lists.focus}`;
    case 'task-detail':
      return `/tasks/${screenshotFixtureIds.tasks.quarterlyReview}`;
    case 'home':
    default:
      return '/(tabs)';
  }
}

function resolveCopy(language: AppLanguage): ScreenshotFixtureCopy {
  if (language === 'tr') {
    return {
      language,
      lists: {
        focus: 'Odak',
        home: 'Ev',
        health: 'Sağlık'
      },
      tasks: {
        quarterlyReview: 'Çeyrek planını takip et',
        productPolish: 'Ürün dokunuşlarını toparla',
        planWeek: 'Haftalık odak planını hazırla',
        payRent: 'Kirayı öde',
        buyFruit: 'Meyve al',
        waterPlants: 'Bitkileri sula',
        gym: 'Akşam antrenmanına git',
        mealPrep: 'Yarın için öğle yemeği hazırla',
        dentist: 'Diş hekimi randevusunu tamamla'
      },
      descriptions: {
        quarterlyReview: 'Plan kapanana kadar seni tekrar uyaran dönen kontrol görevi.',
        productPolish: 'Bugün kapanması gereken son düzeltmeleri toparla.',
        planWeek: 'Pazartesi öncesi odaklanacağın üç işi netleştir.',
        payRent: 'Ay kapanmadan banka havalesini tamamla.',
        waterPlants: 'Salondaki ve balkondaki saksıları unutma.',
        mealPrep: 'Yarın sabah vakit kazandıran hazırlık görevi.',
        dentist: 'Kontrol tamamlandı ve notları kaydedildi.'
      }
    };
  }

  return {
    language,
    lists: {
      focus: 'Focus',
      home: 'Home',
      health: 'Health'
    },
    tasks: {
      quarterlyReview: 'Follow up on the quarterly review',
      productPolish: 'Wrap up the product polish list',
      planWeek: 'Plan next week priorities',
      payRent: 'Pay rent',
      buyFruit: 'Buy fresh fruit',
      waterPlants: 'Water the plants',
      gym: 'Go to the evening workout',
      mealPrep: 'Prep lunch for tomorrow',
      dentist: 'Finish the dentist follow-up'
    },
    descriptions: {
      quarterlyReview: 'A recurring reminder that stays visible until the plan is wrapped up.',
      productPolish: 'The final pass for the small improvements shipping today.',
      planWeek: 'Pick the three priorities that matter next week.',
      payRent: 'Complete the transfer before the end of the day.',
      waterPlants: 'Keep the living room and balcony plants on schedule.',
      mealPrep: 'A light prep task that keeps tomorrow calm.',
      dentist: 'The appointment is done and the notes are filed.'
    }
  };
}

function resolveLanguage(locale?: string | null): AppLanguage {
  const normalized = (locale ?? '').trim().toLowerCase();
  return normalized.startsWith('tr') ? 'tr' : 'en';
}

function at(reference: Date, dayOffset: number, hour: number, minute = 0): Date {
  return setTimeOnDate(addDays(reference, dayOffset), `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
}

function createList(id: string, name: string, color: string, icon: string, sortOrder: number, createdAt: string): AppList {
  return {
    id,
    name,
    color,
    icon,
    sortOrder,
    createdAt,
    seedKey: null,
    seedNameLocked: 1
  };
}

function createTask(task: Omit<Task, 'notificationIdsJson'> & { notificationIdsJson?: string }): Task {
  return {
    ...task,
    notificationIdsJson: task.notificationIdsJson ?? '[]'
  };
}

export function createScreenshotSeedPayload(locale?: string | null, now = new Date()): BackupPayload {
  const language = resolveLanguage(locale);
  const copy = resolveCopy(language);
  const today = startOfDay(now);
  const createdAt = at(today, -14, 9).toISOString();
  const updatedAt = at(today, -1, 10).toISOString();
  const recurringStart = at(today, -4, 9);
  const recurringLastNotification = at(today, -1, 14);
  const recurringNextNotification = at(today, -1, 16);
  const productPolishTime = at(today, 0, 11, 30);
  const planWeekTime = at(today, 3, 9, 0);
  const overdueRentTime = at(today, -1, 8, 30);
  const todoAnchor = at(today, 0, 12, 0);
  const waterPlantsTime = at(today, 0, 18, 30);
  const gymTime = at(today, 0, 19, 15);
  const mealPrepTime = at(today, 1, 8, 0);
  const dentistCompletedAt = at(today, -2, 16, 30);

  const lists: AppList[] = [
    createList(screenshotFixtureIds.lists.focus, copy.lists.focus, '#116466', 'briefcase-outline', 0, createdAt),
    createList(screenshotFixtureIds.lists.home, copy.lists.home, '#B5651D', 'home-outline', 1, createdAt),
    createList(screenshotFixtureIds.lists.health, copy.lists.health, '#2E8B57', 'heart-outline', 2, createdAt)
  ];

  const tasks: Task[] = [
    createTask({
      id: screenshotFixtureIds.tasks.quarterlyReview,
      title: copy.tasks.quarterlyReview,
      description: copy.descriptions.quarterlyReview,
      listId: screenshotFixtureIds.lists.focus,
      sortOrder: 0,
      createdAt,
      updatedAt,
      startReminderType: 'exact_date_time',
      startDateTime: recurringStart.toISOString(),
      startReminderWeekday: null,
      startReminderDayOfMonth: null,
      startReminderTime: '09:00',
      startReminderUsesLastDay: 0,
      taskMode: 'recurring',
      repeatIntervalType: 'preset',
      repeatIntervalValue: 4,
      repeatIntervalUnit: 'hours',
      status: 'active',
      lastNotificationAt: recurringLastNotification.toISOString(),
      nextNotificationAt: recurringNextNotification.toISOString(),
      snoozedUntil: null,
      completedAt: null
    }),
    createTask({
      id: screenshotFixtureIds.tasks.productPolish,
      title: copy.tasks.productPolish,
      description: copy.descriptions.productPolish,
      listId: screenshotFixtureIds.lists.focus,
      sortOrder: 1,
      createdAt,
      updatedAt,
      startReminderType: 'today_at_time',
      startDateTime: productPolishTime.toISOString(),
      startReminderWeekday: null,
      startReminderDayOfMonth: null,
      startReminderTime: '11:30',
      startReminderUsesLastDay: 0,
      taskMode: 'single',
      repeatIntervalType: 'preset',
      repeatIntervalValue: 3,
      repeatIntervalUnit: 'hours',
      status: 'active',
      lastNotificationAt: null,
      nextNotificationAt: productPolishTime.toISOString(),
      snoozedUntil: null,
      completedAt: null
    }),
    createTask({
      id: screenshotFixtureIds.tasks.planWeek,
      title: copy.tasks.planWeek,
      description: copy.descriptions.planWeek,
      listId: screenshotFixtureIds.lists.focus,
      sortOrder: 2,
      createdAt,
      updatedAt,
      startReminderType: 'exact_date_time',
      startDateTime: planWeekTime.toISOString(),
      startReminderWeekday: null,
      startReminderDayOfMonth: null,
      startReminderTime: '09:00',
      startReminderUsesLastDay: 0,
      taskMode: 'single',
      repeatIntervalType: 'preset',
      repeatIntervalValue: 24,
      repeatIntervalUnit: 'hours',
      status: 'active',
      lastNotificationAt: null,
      nextNotificationAt: planWeekTime.toISOString(),
      snoozedUntil: null,
      completedAt: null
    }),
    createTask({
      id: screenshotFixtureIds.tasks.payRent,
      title: copy.tasks.payRent,
      description: copy.descriptions.payRent,
      listId: screenshotFixtureIds.lists.home,
      sortOrder: 0,
      createdAt,
      updatedAt,
      startReminderType: 'exact_date_time',
      startDateTime: overdueRentTime.toISOString(),
      startReminderWeekday: null,
      startReminderDayOfMonth: null,
      startReminderTime: '08:30',
      startReminderUsesLastDay: 0,
      taskMode: 'single',
      repeatIntervalType: 'preset',
      repeatIntervalValue: 24,
      repeatIntervalUnit: 'hours',
      status: 'active',
      lastNotificationAt: at(today, -1, 8, 30).toISOString(),
      nextNotificationAt: overdueRentTime.toISOString(),
      snoozedUntil: null,
      completedAt: null
    }),
    createTask({
      id: screenshotFixtureIds.tasks.buyFruit,
      title: copy.tasks.buyFruit,
      description: '',
      listId: screenshotFixtureIds.lists.home,
      sortOrder: 1,
      createdAt,
      updatedAt,
      startReminderType: 'today_at_time',
      startDateTime: todoAnchor.toISOString(),
      startReminderWeekday: null,
      startReminderDayOfMonth: null,
      startReminderTime: '12:00',
      startReminderUsesLastDay: 0,
      taskMode: 'todo',
      repeatIntervalType: 'preset',
      repeatIntervalValue: 1,
      repeatIntervalUnit: 'hours',
      status: 'active',
      lastNotificationAt: null,
      nextNotificationAt: null,
      snoozedUntil: null,
      completedAt: null
    }),
    createTask({
      id: screenshotFixtureIds.tasks.waterPlants,
      title: copy.tasks.waterPlants,
      description: copy.descriptions.waterPlants,
      listId: screenshotFixtureIds.lists.home,
      sortOrder: 2,
      createdAt,
      updatedAt,
      startReminderType: 'today_at_time',
      startDateTime: waterPlantsTime.toISOString(),
      startReminderWeekday: null,
      startReminderDayOfMonth: null,
      startReminderTime: '18:30',
      startReminderUsesLastDay: 0,
      taskMode: 'single',
      repeatIntervalType: 'preset',
      repeatIntervalValue: 2,
      repeatIntervalUnit: 'hours',
      status: 'active',
      lastNotificationAt: at(today, 0, 16, 0).toISOString(),
      nextNotificationAt: waterPlantsTime.toISOString(),
      snoozedUntil: waterPlantsTime.toISOString(),
      completedAt: null
    }),
    createTask({
      id: screenshotFixtureIds.tasks.gym,
      title: copy.tasks.gym,
      description: '',
      listId: screenshotFixtureIds.lists.health,
      sortOrder: 0,
      createdAt,
      updatedAt,
      startReminderType: 'today_at_time',
      startDateTime: gymTime.toISOString(),
      startReminderWeekday: null,
      startReminderDayOfMonth: null,
      startReminderTime: '19:15',
      startReminderUsesLastDay: 0,
      taskMode: 'single',
      repeatIntervalType: 'preset',
      repeatIntervalValue: 12,
      repeatIntervalUnit: 'hours',
      status: 'active',
      lastNotificationAt: null,
      nextNotificationAt: gymTime.toISOString(),
      snoozedUntil: null,
      completedAt: null
    }),
    createTask({
      id: screenshotFixtureIds.tasks.mealPrep,
      title: copy.tasks.mealPrep,
      description: copy.descriptions.mealPrep,
      listId: screenshotFixtureIds.lists.health,
      sortOrder: 1,
      createdAt,
      updatedAt,
      startReminderType: 'tomorrow_at_time',
      startDateTime: mealPrepTime.toISOString(),
      startReminderWeekday: null,
      startReminderDayOfMonth: null,
      startReminderTime: '08:00',
      startReminderUsesLastDay: 0,
      taskMode: 'single',
      repeatIntervalType: 'preset',
      repeatIntervalValue: 24,
      repeatIntervalUnit: 'hours',
      status: 'active',
      lastNotificationAt: null,
      nextNotificationAt: mealPrepTime.toISOString(),
      snoozedUntil: null,
      completedAt: null
    }),
    createTask({
      id: screenshotFixtureIds.tasks.dentist,
      title: copy.tasks.dentist,
      description: copy.descriptions.dentist,
      listId: screenshotFixtureIds.lists.health,
      sortOrder: 2,
      createdAt,
      updatedAt: dentistCompletedAt.toISOString(),
      startReminderType: 'exact_date_time',
      startDateTime: at(today, -3, 10, 0).toISOString(),
      startReminderWeekday: null,
      startReminderDayOfMonth: null,
      startReminderTime: '10:00',
      startReminderUsesLastDay: 0,
      taskMode: 'single',
      repeatIntervalType: 'preset',
      repeatIntervalValue: 24,
      repeatIntervalUnit: 'hours',
      status: 'completed',
      lastNotificationAt: at(today, -3, 10, 0).toISOString(),
      nextNotificationAt: null,
      snoozedUntil: null,
      completedAt: dentistCompletedAt.toISOString()
    })
  ];

  const settings: AppSettings = {
    id: 'singleton',
    defaultStartTime: '09:00',
    soundEnabled: 1,
    vibrationEnabled: 1,
    autoHideCompletedTasks: 0,
    onboardingCompleted: 1,
    themeMode: 'light',
    language: copy.language
  };

  return {
    schemaVersion: 4,
    exportedAt: now.toISOString(),
    lists,
    tasks,
    taskCompletionHistory: [],
    taskNotifications: [],
    settings
  };
}
