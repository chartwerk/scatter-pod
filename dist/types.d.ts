import { TimeSerie, Options } from '@chartwerk/core';
declare type ScatterDataParams = {
    pointType: PointType;
    lineType: LineType;
    pointSize: number;
    colorFormatter?: ColorFormatter;
};
declare type ScatterOptionsParams = {
    voronoiRadius: number;
    circleView: boolean;
    renderGrid: boolean;
};
export declare type ScatterData = TimeSerie & Partial<ScatterDataParams>;
export declare type ScatterOptions = Options & Partial<ScatterOptionsParams>;
export declare enum PointType {
    NONE = "none",
    CIRCLE = "circle",
    RECTANGLE = "rectangle"
}
export declare enum LineType {
    NONE = "none",
    SOLID = "solid",
    DASHED = "dashed"
}
export declare type ColorFormatter = (datapoint: number[]) => string;
export {};
