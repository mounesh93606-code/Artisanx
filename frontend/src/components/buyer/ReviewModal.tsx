import { useState } from 'react';
import { Star, X } from 'lucide-react';
import api from '../../lib/api';

interface ReviewModalProps {
    order: any;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ReviewModal({ order, onClose, onSuccess }: ReviewModalProps) {
    const [overallRating, setOverallRating] = useState(0);
    const [qualityRating, setQualityRating] = useState(0);
    const [communicationRating, setCommunicationRating] = useState(0);
    const [timelinessRating, setTimelinessRating] = useState(0);
    const [reviewText, setReviewText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const StarRating = ({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) => (
        <div className="flex justify-between items-center text-sm">
            <span className="text-stone-700">{label}</span>
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                    <Star 
                        key={star}
                        className={`w-5 h-5 cursor-pointer transition-colors ${star <= value ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}`}
                        onClick={() => onChange(star)}
                    />
                ))}
            </div>
        </div>
    );

    const handleSubmit = async () => {
        if (!overallRating) return alert("Please select an overall rating.");
        
        setIsSubmitting(true);
        try {
            await api.post('/reviews/', {
                order_id: order.id,
                rating_overall: overallRating,
                rating_quality: qualityRating || overallRating,
                rating_communication: communicationRating || overallRating,
                rating_timeliness: timelinessRating || overallRating,
                review_text: reviewText.trim() || undefined
            });
            alert("Thank you! Your review has been submitted.");
            onSuccess();
        } catch (err: any) {
            console.error("Review submission failed", err);
            alert(err.response?.data?.detail || err.message || "Failed to submit review");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-surface rounded-3xl w-full max-w-md p-6 animate-in zoom-in-95 relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600">
                    <X className="w-5 h-5" />
                </button>
                
                <h2 className="text-xl font-bold mb-1">Review Product</h2>
                <p className="text-sm text-stone-500 mb-6 line-clamp-1">{order.product_snapshot?.title}</p>
                
                <div className="space-y-4 mb-6">
                    <div className="mb-6 pb-6 border-b border-stone-100">
                        <div className="flex justify-between items-center text-base font-bold mb-2">
                            <span>Overall Rating</span>
                        </div>
                        <div className="flex gap-2 justify-center my-4">
                            {[1, 2, 3, 4, 5].map(star => (
                                <Star 
                                    key={star}
                                    className={`w-8 h-8 cursor-pointer transition-colors ${star <= overallRating ? 'text-amber-400 fill-amber-400' : 'text-stone-200'}`}
                                    onClick={() => setOverallRating(star)}
                                />
                            ))}
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <h3 className="font-bold text-sm mb-2">Detailed Ratings (Optional)</h3>
                        <StarRating label="Quality" value={qualityRating} onChange={setQualityRating} />
                        <StarRating label="Communication" value={communicationRating} onChange={setCommunicationRating} />
                        <StarRating label="Timeliness" value={timelinessRating} onChange={setTimelinessRating} />
                    </div>

                    <label className="block mt-6">
                        <span className="text-sm font-bold text-stone-700">Written Review (Optional)</span>
                        <textarea 
                            className="mt-2 w-full border border-stone-300 rounded-xl p-3 bg-white min-h-[100px] text-sm"
                            value={reviewText}
                            onChange={e => setReviewText(e.target.value)}
                            placeholder="What did you like or dislike? How was the craftsmanship?"
                        />
                    </label>
                </div>
                
                <button onClick={handleSubmit} disabled={!overallRating || isSubmitting} className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center">
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
            </div>
        </div>
    );
}
