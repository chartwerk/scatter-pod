import { TimeSerie, Options } from '@chartwerk/base';
declare type ScatterDataParams = {
    renderType: RenderType;
    pointSize: number;
};
export declare type ScatterData = TimeSerie & Partial<ScatterDataParams>;
export declare type ScatterOptions = Options;
export declare enum RenderType {
    POINT = "point",
    LINE = "line"
}
export {};
