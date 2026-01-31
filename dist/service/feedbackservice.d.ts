export interface Feedback {
    productId: string;
    userId: string;
    comment: string;
    rating: number;
}
export interface FeedbackResponse {
    id: string;
    userId: string;
    productid: string;
    rating: number | null;
    message: string | null;
    submittedAt: Date | null;
}
export interface FeedbackService {
    createFeedback(feedback: Feedback): Promise<FeedbackResponse>;
    getFeedbackByProduct(productId: string, page?: number, limit?: number): Promise<any>;
    gettopfeedbacks(productId: string, userId?: string): Promise<any>;
}
export declare class FeedbackServiceImpl implements FeedbackService {
    createFeedback(feedback: Feedback): Promise<FeedbackResponse>;
    getFeedbackByProduct(productId: string, page: number, limit: number): Promise<any>;
    gettopfeedbacks(Productid: string, userId?: string): Promise<any>;
}
//# sourceMappingURL=feedbackservice.d.ts.map