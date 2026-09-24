import type { ComponentType } from 'react';
import type { TaskType } from '../../shared/types';
import { AlignEngine } from './games/AlignEngine';
import { CalibrateDistributor } from './games/CalibrateDistributor';
import { ClearAsteroids } from './games/ClearAsteroids';
import { DivertPower } from './games/DivertPower';
import { EmptyGarbage } from './games/EmptyGarbage';
import { FixWiring } from './games/FixWiring';
import { FuelEngines } from './games/FuelEngines';
import { StabilizeSteering } from './games/StabilizeSteering';
import { StartReactor } from './games/StartReactor';
import { SubmitScan } from './games/SubmitScan';
import { SwipeCard } from './games/SwipeCard';
import { TransferData } from './games/TransferData';
import type { TaskGameProps } from './types';

export const TASK_GAMES: Record<TaskType, ComponentType<TaskGameProps>> = {
  wires: FixWiring,
  swipe: SwipeCard,
  calibrate: CalibrateDistributor,
  divert: DivertPower,
  transfer: TransferData,
  align: AlignEngine,
  steering: StabilizeSteering,
  fuel: FuelEngines,
  asteroids: ClearAsteroids,
  garbage: EmptyGarbage,
  scan: SubmitScan,
  simon: StartReactor,
};
