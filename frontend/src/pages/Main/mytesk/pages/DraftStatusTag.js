import React from "react";

const STATUS_CLASS_MAP = {
    "임시저장": "tag-blue",
    "결재대기": "tag-amber",
    "최종승인": "tag-emerald",
    "반려": "tag-red",
};

export default function DraftStatusTag({ status }) {
    const tagColor = STATUS_CLASS_MAP[status] || "tag-blue";

    return (
        <span className={`attendance-tag ${tagColor}`}>
            {status || "-"}
        </span>
    );
}