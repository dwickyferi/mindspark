import { ThemeToggleSwitch } from '@/components/theme-toggle-switch';

export default function ThemeToggleDemo() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Theme Toggle Demo
          </h1>
          <p className="text-muted-foreground text-lg">
            Test the improved dark mode visibility
          </p>
        </div>
        
        <div className="space-y-6">
          <div className="p-6 bg-card rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Standard Toggle</h2>
            <ThemeToggleSwitch layout="justify-between" />
          </div>
          
          <div className="p-6 bg-card rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Small Toggle</h2>
            <ThemeToggleSwitch size="sm" layout="justify-between" />
          </div>
          
          <div className="p-6 bg-card rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Large Toggle</h2>
            <ThemeToggleSwitch size="lg" layout="justify-between" />
          </div>
          
          <div className="p-6 bg-card rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Inline Toggle</h2>
            <ThemeToggleSwitch layout="inline" />
          </div>
        </div>
        
        <div className="p-6 bg-card rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Instructions:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Click any toggle to switch between light and dark modes</li>
            <li>• In dark mode, you should now see a bright moon icon with glow effect</li>
            <li>• The toggle track should have a prominent purple glow in dark mode</li>
            <li>• The thumb should have a dark background with glowing border in dark mode</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
