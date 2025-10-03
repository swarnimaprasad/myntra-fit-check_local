/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { motion } from 'framer-motion';
import { AnalysisResult } from '../types';
import { UserFocusIcon } from './icons';

interface AnalysisPanelProps {
    analysis: AnalysisResult | null;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysis }) => {
    if (!analysis) {
        return (
            <div>
                <h2 className="text-base font-bold text-gray-800 tracking-wider uppercase mb-2">AI Analysis</h2>
                <div className="bg-gray-100/80 rounded-lg p-4 text-center border">
                    <p className="text-sm text-gray-500">Your profile analysis will appear here after creating your model.</p>
                </div>
            </div>
        );
    }

    const { bodyType, skinTone, recommendedColors, recommendedStyles } = analysis;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            <h2 className="text-base font-bold text-gray-800 tracking-wider uppercase mb-2 flex items-center gap-2">
                <UserFocusIcon className="w-5 h-5"/>
                <span>AI Analysis</span>
            </h2>
            <div className="space-y-3 bg-white/50 border border-gray-200/80 shadow-sm rounded-lg p-4">
                <div>
                    <h3 className="text-xs text-gray-500 font-bold uppercase">Body Type</h3>
                    <p className="text-sm text-primary-700 font-semibold">{bodyType}</p>
                </div>
                 <div>
                    <h3 className="text-xs text-gray-500 font-bold uppercase">Skin Undertone</h3>
                    <p className="text-sm text-primary-700 font-semibold">{skinTone}</p>
                </div>
                <div>
                    <h3 className="text-xs text-gray-500 font-bold uppercase">Recommended Colors</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {recommendedColors.map(colorInfo => (
                            <div key={colorInfo.hex} className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: colorInfo.hex }}></div>
                                <span className="text-xs text-gray-700 capitalize">{colorInfo.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
                 <div>
                    <h3 className="text-xs text-gray-500 font-bold uppercase">Recommended Styles</h3>
                    <p className="text-xs text-gray-700 leading-relaxed break-words">{recommendedStyles.join(', ')}</p>
                </div>
            </div>
        </motion.div>
    );
};

export default AnalysisPanel;