import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Flag, Timer } from "lucide-react";

interface Lap {
  number: number;
  time: number;
  split: number;
}

interface StopwatchProps {
  onTimeRecorded?: (timeInSeconds: number) => void;
  title?: string;
}

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  
  return {
    display: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`,
    seconds: ms / 1000
  };
};

export function Stopwatch({ onTimeRecorded, title = "Chronomètre" }: StopwatchProps) {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState<Lap[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);

  const start = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true);
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        setTime(accumulatedTimeRef.current + (Date.now() - startTimeRef.current));
      }, 10);
    }
  }, [isRunning]);

  const pause = useCallback(() => {
    if (isRunning && intervalRef.current) {
      setIsRunning(false);
      clearInterval(intervalRef.current);
      accumulatedTimeRef.current += Date.now() - startTimeRef.current;
    }
  }, [isRunning]);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsRunning(false);
    setTime(0);
    setLaps([]);
    accumulatedTimeRef.current = 0;
    startTimeRef.current = 0;
  }, []);

  const lap = useCallback(() => {
    if (isRunning && time > 0) {
      const lastLapTime = laps.length > 0 ? laps[laps.length - 1].time : 0;
      setLaps(prev => [...prev, {
        number: prev.length + 1,
        time: time,
        split: time - lastLapTime
      }]);
    }
  }, [isRunning, time, laps]);

  const recordTime = useCallback(() => {
    if (time > 0 && onTimeRecorded) {
      onTimeRecorded(time / 1000);
    }
  }, [time, onTimeRecorded]);

  const { display } = formatTime(time);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Timer className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timer display */}
        <div className="text-center py-6 bg-secondary/30 rounded-lg">
          <span className="font-mono text-5xl font-bold tracking-tight">
            {display}
          </span>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-3">
          {!isRunning ? (
            <Button onClick={start} size="lg" className="w-24">
              <Play className="h-5 w-5 mr-1" />
              Start
            </Button>
          ) : (
            <Button onClick={pause} size="lg" variant="secondary" className="w-24">
              <Pause className="h-5 w-5 mr-1" />
              Pause
            </Button>
          )}
          
          <Button onClick={lap} size="lg" variant="outline" disabled={!isRunning}>
            <Flag className="h-5 w-5 mr-1" />
            Tour
          </Button>
          
          <Button onClick={reset} size="lg" variant="ghost">
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>

        {/* Record button */}
        {onTimeRecorded && time > 0 && !isRunning && (
          <Button onClick={recordTime} className="w-full" variant="default">
            Enregistrer ce temps ({formatTime(time).seconds.toFixed(2)}s)
          </Button>
        )}

        {/* Laps */}
        {laps.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-40 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">Tour</th>
                    <th className="text-right p-2">Split</th>
                    <th className="text-right p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...laps].reverse().map((l) => (
                    <tr key={l.number} className="border-t">
                      <td className="p-2 font-medium">{l.number}</td>
                      <td className="text-right p-2 text-muted-foreground">
                        {formatTime(l.split).display}
                      </td>
                      <td className="text-right p-2 font-mono">
                        {formatTime(l.time).display}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
