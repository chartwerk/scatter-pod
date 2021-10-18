import { ScatterData } from './types';
import * as d3 from 'd3';
export declare class DelaunayDiagram {
    protected series: ScatterData[];
    private _delaunayData;
    private _delaunayDiagram;
    constructor(series: ScatterData[], xScale: d3.ScaleLinear<number, number>, yScale: (string: any) => d3.ScaleLinear<number, number>);
    get data(): number[][] | undefined;
    setDelaunayDiagram(xScale: d3.ScaleLinear<number, number>, yScale: (string: any) => d3.ScaleLinear<number, number>): void;
    findPointIndex(eventX: number, eventY: number): number | undefined;
    getDataRowByIndex(index: number): number[] | undefined;
    protected getDatapointsForDelaunay(): number[][] | undefined;
    protected concatSeriesDatapoints(series: ScatterData[]): number[][];
    protected getSerieIdxByTarget(target: string): number;
}
