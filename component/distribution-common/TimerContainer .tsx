import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTranslation } from "react-i18next";

// Type definitions
interface CircleProgressProps {
  size: number;
  strokeWidth: number;
  progress: number;
  fillColor: string;
  backgroundColor: string;
}

interface TimerProps {
  size?: number;
  fontSize?: number;
  minutes?: number;
  fillColor?: string;
  bgColor?: string;
  backgroundColor?: string;
  showMs?: boolean;
  onComplete?: () => void;
  completeMsg?: string;
  running?: boolean;
  setRunning?: React.Dispatch<React.SetStateAction<boolean>> | null;
  timeAtLoad?: number;
  reset?: boolean;
  setReset?: React.Dispatch<React.SetStateAction<boolean>> | null;
  strokeWidth?: number;
}

// Animated Circle Component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Circle Progress Component with smooth animation
const CircleProgress: React.FC<CircleProgressProps> = ({ 
  size, 
  strokeWidth, 
  progress, 
  fillColor, 
  backgroundColor 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference * (1 - progress);
  

  return (
    <Svg width={size} height={size} style={{ position: 'absolute' }}>
      <G rotation="-90" origin={`${size/2}, ${size/2}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={fillColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
};

// Main Timer Component with smooth progress
const Timer: React.FC<TimerProps> = ({
  size = 200,
  fontSize = 40,
  minutes = 1,
  fillColor = '#5bcc69',
  bgColor = '#ffffff',
  backgroundColor = '#e0e0e0',
  showMs = false,
  onComplete = () => console.log('Timer complete'),
  completeMsg = '',
  running = true,
  setRunning = null,
  timeAtLoad = Date.now(),
  reset = false,
  setReset = null,
  strokeWidth = 8
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(minutes * 60 * 1000);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(minutes * 60 * 1000);
  const { t } = useTranslation();
  
 
  const totalTime = minutes * 60 * 1000;


  const handleCompletion = useCallback(() => {
    if (!isCompleted) {
      setIsCompleted(true);
      if (setRunning) setRunning(false);
      onComplete();
    }
  }, [isCompleted, setRunning, onComplete]);


  useEffect(() => {
    if (reset) {
      setTimeLeft(totalTime);
      setIsCompleted(false);
      pausedTimeRef.current = totalTime;
      startTimeRef.current = null;
      if (setReset) setReset(false);
    }
  }, [reset, totalTime, setReset]);

 
  useEffect(() => {
    if (timeLeft <= 0 && !isCompleted) {
      handleCompletion();
    }
  }, [timeLeft, isCompleted, handleCompletion]);


  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (running && timeLeft > 0 && !isCompleted) {
      // Set start time when timer begins
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }

      intervalRef.current = setInterval(() => {
        const currentTime = Date.now();
        const elapsedTime = currentTime - (startTimeRef.current || currentTime);
        const newTimeLeft = Math.max(0, pausedTimeRef.current - elapsedTime);
        
        setTimeLeft(newTimeLeft);
        
          if (newTimeLeft <= 0 && intervalRef.current) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
      }, 16); 
    } else if (!running && timeLeft > 0) {
    
      pausedTimeRef.current = timeLeft;
      startTimeRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, timeLeft, isCompleted]);


  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  
  const progress = Math.max(0, Math.min(1, timeLeft / totalTime));
  const mins = Math.floor((timeLeft % 3600000) / 60000);
  const secs = Math.floor((timeLeft % 60000) / 1000);
  const mils = Math.floor((timeLeft % 1000) / 10);
   

  const pad = (num: number): string => num.toString().padStart(2, '0');
  const displayTime = `${pad(mins)}:${pad(secs)}${showMs ? `:${pad(mils)}` : ''}`;

  const innerSize = size * 0.8;

  return (
    <View style={{ 
      width: size, 
      height: size, 
      justifyContent: 'center', 
      alignItems: 'center',
      position: 'relative'
    }}>
   
      <View style={{
        width: innerSize,
        height: innerSize,
        backgroundColor: bgColor,
        borderRadius: innerSize / 2,
        position: 'absolute',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      }}/>
      
  
      <CircleProgress
        size={size}
        strokeWidth={strokeWidth}
        progress={progress}
        fillColor={fillColor}
        backgroundColor={backgroundColor}
      />
      
      
      <Text style={{ 
        fontSize, 
        color: fillColor,
        fontWeight: '500',
        position: 'absolute',
        textAlign: 'center',
      }}>
        {timeLeft > 0 ? displayTime : completeMsg}
      </Text>
    </View>
  );
};

// Timer Container with Controls
const TimerContainer: React.FC = () => {
  const [running, setRunning] = useState<boolean>(false);
  const [reset, setReset] = useState<boolean>(false);
  const { t } = useTranslation();

  const handleStart = (): void => setRunning(true);
  const handlePause = (): void => setRunning(false);
  const handleReset = (): void => {
    setRunning(false);
    setReset(true);
  };

  const handleComplete = (): void => {
    console.log('Timer completed!');
  };

  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f3f4f6',
      padding: 32,
    }}>
      <Timer
        size={250}
        fontSize={32}
        minutes={0.1} // 6 seconds for demo
        fillColor="#3B82F6"
        bgColor="#FFFFFF"
        backgroundColor="#E5E7EB"
        showMs={true}
        running={running}
        setRunning={setRunning}
        reset={reset}
        setReset={setReset}
        onComplete={handleComplete}
        completeMsg="Done!"
        strokeWidth={10}
      />
      
      <View style={{
        flexDirection: 'row',
        marginTop: 32,
        gap: 16,
      }}>
        <TouchableOpacity 
          style={{
            backgroundColor: '#10b981',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}
          onPress={handleStart}
        >
          <Text style={{
            color: 'white',
            fontWeight: '600',
            textAlign: 'center',
          }}>
             {t("TimerContainer.Start")}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={{
            backgroundColor: '#f59e0b',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}
          onPress={handlePause}
        >
          <Text style={{
            color: 'white',
            fontWeight: '600',
            textAlign: 'center',
          }}>
             {t("TimerContainer.Pause")}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={{
            backgroundColor: '#ef4444',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}
          onPress={handleReset}
        >
          <Text style={{
            color: 'white',
            fontWeight: '600',
            textAlign: 'center',
          }}>
             {t("TimerContainer.Reset")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Timer;
export { TimerContainer };