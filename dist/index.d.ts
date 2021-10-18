import { ChartwerkPod, TickOrientation, TimeFormat, yAxisOrientation } from '@chartwerk/core';
import { ScatterData, ScatterOptions, PointType, LineType } from './types';
import { DelaunayDiagram } from './delaunay';
import * as d3 from 'd3';
export declare class ChartwerkScatterPod extends ChartwerkPod<ScatterData, ScatterOptions> {
    _metricsContainer: any;
    _delaunayDiagram: DelaunayDiagram;
    constructor(el: HTMLElement, _series?: ScatterData[], _options?: ScatterOptions);
    renderMetrics(): void;
    renderMetricContainer(): void;
    protected updateCrosshair(): void;
    appendCrosshairPoints(): void;
    protected appendCrosshairPoint(serieIdx: number): void;
    protected renderLines(): void;
    renderLine(datapoints: number[][], lineType: LineType, color: string, orientation: yAxisOrientation): void;
    protected renderPoints(): void;
    onPanningEnd(): void;
    unhighlight(): void;
    highlight(pointIdx: number): void;
    protected getCrosshairCircleBackgroundSize(serieIdx: number): number;
    renderSharedCrosshair(values: {
        x?: number;
        y?: number;
    }): void;
    moveCrosshairLine(xPosition: number, yPosition: number): void;
    findAndHighlightDatapoints(eventX: number, eventY: number): {
        values: any[];
        pointIdx: number;
    } | null;
    protected getYScale(orientation: yAxisOrientation): d3.ScaleLinear<number, number>;
    hideSharedCrosshair(): void;
    onMouseMove(): void;
    onMouseOver(): void;
    onMouseOut(): void;
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
        destroyed(): void;
        methods: {
            render(): void;
            renderSharedCrosshair(values: {
                x?: number;
                y?: number;
            }): void;
            hideSharedCrosshair(): void;
            onPanningRescale(event: any): void;
            renderChart(): void;
            appendEvents(): void;
            zoomIn(range: any): void;
            zoomOut(centers: any): void;
            mouseMove(evt: any): void;
            mouseOut(): void;
            onLegendClick(idx: any): void;
            panningEnd(range: any): void;
            panning(range: any): void;
            contextMenu(evt: any): void;
            sharedCrosshairMove(event: any): void;
            renderEnd(): void;
        };
    }[];
    methods: {
        render(): void;
    };
};
export { ScatterData, ScatterOptions, TickOrientation, TimeFormat, PointType, LineType };
