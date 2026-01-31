interface BizContent {
    [key: string]: any;
}
interface RequestObject {
    [key: string]: any;
    biz_content?: BizContent;
}
declare function signRequestObject(requestObject: RequestObject): string;
declare const signString: (text: string, privateKey: string) => string;
declare function createTimeStamp(): string;
declare function createNonceStr(): string;
export { signString, signRequestObject, createTimeStamp, createNonceStr };
//# sourceMappingURL=tools.d.ts.map