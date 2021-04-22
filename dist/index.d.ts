import { ChartwerkPod, TickOrientation, TimeFormat, yAxisOrientation } from '@chartwerk/core';
import { ScatterData, ScatterOptions, PointType, LineType, ColorFormatter } from './types';
import * as d3 from 'd3';
export declare class ChartwerkScatterPod extends ChartwerkPod<ScatterData, ScatterOptions> {
    _metricsContainer: any;
    _voronoiDiagramY: any;
    _voronoiDiagramY1: any;
    _voronoiRadius: number;
    constructor(el: HTMLElement, _series?: ScatterData[], _options?: ScatterOptions);
    renderMetrics(): void;
    protected updateCrosshair(): void;
    appendCrosshairPoints(): void;
    protected appendCrosshairPoint(serieIdx: number): void;
    protected renderMetric(datapoints: number[][], metricOptions: {
        color: string;
        colorFormatter: ColorFormatter;
        target: string;
        pointType: PointType;
        lineType: LineType;
        pointSize: number;
        orientation: yAxisOrientation;
    }): void;
    renderLine(datapoints: number[][], lineType: LineType, color: string, orientation: yAxisOrientation): void;
    protected renderPoints(datapoints: number[][], pointType: PointType, pointSize: number, color: string | ColorFormatter, orientation: yAxisOrientation): void;
    protected voronoiDiagramInit(): void;
    onPanningEnd(): void;
    unhighlight(): void;
    highlight(datapoint: number[]): void;
    protected getCrosshairCircleBackgroundSize(serieIdx: number): number;
    renderSharedCrosshair(timestamp: number): void;
    protected getYScale(orientation: yAxisOrientation): d3.ScaleLinear<number, number>;
    hideSharedCrosshair(): void;
    onMouseMove(): void;
    findItemsByVoronoi(eventX: any, eventY: any): any | undefined;
    onMouseOver(): void;
    onMouseOut(): void;
    getAllDatapointsY(): number[][] | undefined;
    filterSeriesByOrientation(serieOrientation: yAxisOrientation, orientation: yAxisOrientation): boolean;
    getAllDatapointsY1(): number[][] | undefined;
    concatSeriesDatapoints(series: ScatterData[]): number[][];
    getSerieIdxByTarget(target: string): number;
}
export declare const VueChartwerkScatterPodObject: {
    render(createElement: any): any;
    mixins: {
        props: {
            id: {
                type: StringConstructor;
                required: boolean;
            };
            series: {
                type: ArrayConstructor;
                required: boolean;
                default: () => any[];
            };
            options: {
                type: ObjectConstructor;
                required: boolean;
                default: () => {};
            };
        };
        watch: {
            id(): void;
            series(): void;
            options(): void;
        };
        mounted(): void;
        methods: {
            render(): void;
            renderChart(): void;
            appendEvents(): void;
            zoomIn(range: any): void;
            zoomOut(center: any): void;
            mouseMove(evt: any): void;
            mouseOut(): void;
            onLegendClick(idx: any): void;
            panningEnd(range: any): void;
            panning(range: any): void;
            contextMenu(evt: any): void;
        };
    }[];
    methods: {
        render(): void;
    };
};
export { ScatterData, ScatterOptions, TickOrientation, TimeFormat, PointType, LineType };
