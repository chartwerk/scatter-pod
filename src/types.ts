import { TimeSerie, Options } from '@chartwerk/core';


type ScatterDataParams = {
  pointType: PointType;
  lineType: LineType;
  pointSize: number;
  colorFormatter?: ColorFormatter
}
export type ScatterData = TimeSerie & Partial<ScatterDataParams>;
export type ScatterOptions = Options;

export enum PointType {
  NONE = 'none',
  CIRCLE = 'circle',
  RECTANGLE = 'rectangle'
}

export enum LineType {
  NONE = 'none',
  SOLID = 'solid',
  DASHED = 'dashed'
}

export type ColorFormatter = (datapoint: number[]) => string;
