export type WidgetTaskMode = 'single' | 'recurring' | 'todo';
export type WidgetTaskState = 'overdue' | 'today' | 'todo';

export type WidgetCounts = {
  overdue: number;
  today: number;
  todo: number;
};

export type WidgetAction = {
  type: 'complete' | 'complete_cycle' | 'complete_finish';
  label: string;
  url: string;
};

export type WidgetTask = {
  id: string;
  title: string;
  listName: string;
  listColor: string;
  dueAt: string | null;
  taskMode: WidgetTaskMode;
  state: WidgetTaskState;
  detailUrl: string;
  actions: WidgetAction[];
};

export type WidgetSnapshot = {
  schemaVersion: 1;
  generatedAt: string;
  locale: 'en' | 'tr';
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyDescription: string;
  counts: WidgetCounts;
  tasks: WidgetTask[];
};
