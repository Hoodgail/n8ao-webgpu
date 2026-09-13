/** Camera-static accumulation, as in N8AO. This is NOT motion-vector reprojection. */
export declare class HistoryState {
    frame: number;
    dirty: boolean;
    view: number[] | null;
    projection: number[] | null;
    constructor();
    reset(): void;
    begin(view: ArrayLike<number>, projection: ArrayLike<number>, accumulate: boolean, samples: number): {
        frame: number;
        render: boolean;
        limit: number;
        samples: number;
    };
}
/** The original blend stores normal X/Y in G/B, but sets history alpha to 1. */
export declare function accumulateRGBA(previous: number[], current: number[], frame: number): number[];
//# sourceMappingURL=history.d.ts.map