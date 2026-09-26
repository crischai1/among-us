import type { ComponentType } from 'react';
import type { TaskType } from '../../shared/types';
import { AlignEngine } from './games/AlignEngine';
import { AlignTelescope } from './games/AlignTelescope';
import { FillCanisters } from './games/FillCanisters';
import { FixWeatherNode } from './games/FixWeatherNode';
import { InsertKeys } from './games/InsertKeys';
import { InspectSample } from './games/InspectSample';
import { MonitorTree } from './games/MonitorTree';
import { OpenWaterways } from './games/OpenWaterways';
import { RebootWifi } from './games/RebootWifi';
import { RecordTemperature } from './games/RecordTemperature';
import { RepairDrill } from './games/RepairDrill';
import { ReplaceWaterJug } from './games/ReplaceWaterJug';
import { ScanBoardingPass } from './games/ScanBoardingPass';
import { StoreArtifacts } from './games/StoreArtifacts';
import { AssembleArtifact } from './games/AssembleArtifact';
import { BuyBeverage } from './games/BuyBeverage';
import { ChartCourse } from './games/ChartCourse';
import { CleanO2Filter } from './games/CleanO2Filter';
import { EnterIdCode } from './games/EnterIdCode';
import { MeasureWeather } from './games/MeasureWeather';
import { PrimeShields } from './games/PrimeShields';
import { ProcessData } from './games/ProcessData';
import { RunDiagnostics } from './games/RunDiagnostics';
import { SortSamples } from './games/SortSamples';
import { UnlockManifolds } from './games/UnlockManifolds';
import { WaterPlants } from './games/WaterPlants';
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
  idcode: EnterIdCode,
  diagnostics: RunDiagnostics,
  water: WaterPlants,
  beverage: BuyBeverage,
  weather: MeasureWeather,
  samples: SortSamples,
  artifact: AssembleArtifact,
  process: ProcessData,
  manifolds: UnlockManifolds,
  filter: CleanO2Filter,
  shields: PrimeShields,
  chart: ChartCourse,
  keys: InsertKeys,
  boarding: ScanBoardingPass,
  telescope: AlignTelescope,
  canisters: FillCanisters,
  node: FixWeatherNode,
  tree: MonitorTree,
  waterways: OpenWaterways,
  wifi: RebootWifi,
  temperature: RecordTemperature,
  drill: RepairDrill,
  jug: ReplaceWaterJug,
  artifacts: StoreArtifacts,
  sample: InspectSample,
};
