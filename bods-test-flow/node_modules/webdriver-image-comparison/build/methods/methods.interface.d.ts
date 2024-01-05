export interface Methods {
    executor: any;
    screenShot: any;
}
export declare type TakeScreenShot = () => Promise<string>;
export declare type Executor = <T>(script: string | Function, ...var_args: any[]) => Promise<T>;
