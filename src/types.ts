import { TimeSerie, Options } from '@chartwerk/base';

type ScatterDataParams = {
  renderType: RenderType;
  pointSize: number;
}
export type ScatterData = TimeSerie & Partial<ScatterDataParams>;
export type ScatterOptions = Options;

export enum RenderType {
  POINT = 'point',
  LINE = 'line'
}
