import { TimeSerie, Options } from '@chartwerk/core';
declare type ScatterDataParams = {
    pointType: PointType;
    lineType: LineType;
    pointSize: number;
};
export declare type ScatterData = TimeSerie & Partial<ScatterDataParams>;
export declare type ScatterOptions = Options;
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
export {};
