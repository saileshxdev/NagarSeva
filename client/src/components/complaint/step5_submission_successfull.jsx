import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FiFileText } from 'react-icons/fi';
import { resetComplaint } from '../../slices/complaintSlice';

export default function Step5_submission_successfull() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { short_id } = useSelector((s) => s.complaint);

    return (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-6 select-none">
            <div className="relative flex items-center justify-center w-24 h-24">
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-[#1e2a5a] rounded-full opacity-70" />
                <span className="absolute top-2 right-3 w-0.5 h-3 bg-[#1e2a5a] rounded-full opacity-70 rotate-45" />
                <span className="absolute top-2 left-3 w-0.5 h-3 bg-[#1e2a5a] rounded-full opacity-70 -rotate-45" />
                <div className="w-16 h-16 rounded-full bg-[#1e2a5a]/8 border-2 border-[#1e2a5a]/20 flex items-center justify-center text-4xl">
                    👍
                </div>
            </div>

            <div className="space-y-2">
                <h2 className="font-black text-gray-900 text-lg tracking-tight">
                    We've received your complaint!
                </h2>
                {short_id && (
                    <p className="text-[11px] font-mono font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded border border-gray-200 inline-block">
                        #{short_id}
                    </p>
                )}
                <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-xs mx-auto">
                    Your civic issue has been submitted and is under review.
                    Municipal authorities will be notified and action will be taken shortly.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                <button
                    onClick={() => {
                        dispatch(resetComplaint());
                        navigate('/citizen/complaints', { replace: true });
                    }}
                    className="flex-1 py-2.5 bg-[#1e2a5a] hover:bg-[#2d3f82] text-white text-xs font-extrabold rounded-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                    <FiFileText className="w-3.5 h-3.5" />
                    View My Complaints
                </button>
                <button
                    onClick={() => {
                        dispatch(resetComplaint());
                        navigate('/citizen', { replace: true });
                    }}
                    className="flex-1 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-extrabold rounded-sm border border-gray-200 transition cursor-pointer"
                >
                    Back to Home
                </button>
            </div>
        </div>
    );
}
