import React from 'react'
import { usePresetReactions } from '@/hooks/usePresetReactions'

function PresetsComp() {
    const { presets } = usePresetReactions()
    return (
        <>
        {presets.map((preset, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-pink-50/30 transition-colors">
                <td className="p-3 border-r border-pink-50 font-medium text-gray-500">{i +1}</td>
                <td className="p-3 whitespace-nowrap">{preset.emojis}</td>
            </tr>
        ))}
        </>
    )
}

export default PresetsComp