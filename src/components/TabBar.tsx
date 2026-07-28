import { ChartIcon, HomeIcon, SlidersIcon } from './icons';

export type TabId = 'home' | 'stats' | 'settings';

const TABS: { id: TabId; label: string; Icon: typeof HomeIcon }[] = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'stats', label: 'Statistieken', Icon: ChartIcon },
  { id: 'settings', label: 'Instellingen', Icon: SlidersIcon }
];

type TabBarProps = {
  active: TabId;
  onChange: (tab: TabId) => void;
};

export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[520px] items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-1 rounded-card px-4 py-1.5 text-xs font-medium transition-colors ${
                isActive ? 'text-text' : 'text-nav-inactive'
              }`}
            >
              <Icon className="h-6 w-6" />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
