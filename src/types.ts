import { TimeSerie, Options } from '@chartwerk/core';


type ScatterDataParams = {
  pointType: PointType;
  lineType: LineType;
  pointSize: number;
  colorFormatter?: ColorFormatter
}
type ScatterOptionsParams = {
  voronoiRadius: number;
  circleView: boolean;
}
export type ScatterData = TimeSerie & Partial<ScatterDataParams>;
export type ScatterOptions = Options & Partial<ScatterOptionsParams>;

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
