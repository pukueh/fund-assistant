
import React, { useState } from 'react';
import { Tag as TagIcon, X, Plus } from 'lucide-react';
import { portfolioApi } from '../../api/portfolio';

interface TagManagerProps {
    fundCode: string;
    initialTags: string[];
    onTagsUpdate?: (newTags: string[]) => void;
    readonly?: boolean;
}

export const TagManager: React.FC<TagManagerProps> = ({
    fundCode,
    initialTags,
    onTagsUpdate,
    readonly = false
}) => {
    const [tags, setTags] = useState<string[]>(initialTags);
    const [isEditing, setIsEditing] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAddTag = async () => {
        if (!newTag.trim() || tags.includes(newTag.trim())) return;

        const updatedTags = [...tags, newTag.trim()];
        setTags(updatedTags);
        setNewTag('');

        try {
            setIsLoading(true);
            await portfolioApi.updateTags(fundCode, updatedTags);
            onTagsUpdate?.(updatedTags);
        } catch (err) {
            console.error('Failed to update tags:', err);
            // Revert on failure
            setTags(tags);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        const updatedTags = tags.filter(t => t !== tagToRemove);
        setTags(updatedTags);

        try {
            setIsLoading(true);
            await portfolioApi.updateTags(fundCode, updatedTags);
            onTagsUpdate?.(updatedTags);
        } catch (err) {
            console.error('Failed to update tags:', err);
            setTags(tags);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-wrap gap-2 items-center">
            {tags.map(tag => (
                <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/20"
                >
                    {tag}
                    {!readonly && (
                        <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:text-white focus:outline-none"
                            disabled={isLoading}
                        >
                            <X size={12} />
                        </button>
                    )}
                </span>
            ))}

            {!readonly && (
                isEditing ? (
                    <div className="flex items-center gap-1">
                        <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                            className="w-20 px-2 py-0.5 text-xs bg-[#1a1a2e] border border-gray-600 rounded text-white focus:border-[#00d4aa] focus:outline-none"
                            placeholder="新标签"
                            autoFocus
                        />
                        <button
                            onClick={handleAddTag}
                            className="text-[#00d4aa] hover:text-white"
                            disabled={isLoading}
                        >
                            <Plus size={14} />
                        </button>
                        <button
                            onClick={() => setIsEditing(false)}
                            className="text-gray-400 hover:text-white"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="p-0.5 text-gray-400 hover:text-[#00d4aa] transition-colors"
                        title="添加标签"
                    >
                        <TagIcon size={14} />
                    </button>
                )
            )}
        </div>
    );
};
