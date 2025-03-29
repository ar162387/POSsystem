import React from 'react';

/**
 * Reusable Pagination Component
 * @param {number} currentPage - Current active page
 * @param {number} totalPages - Total number of pages
 * @param {function} onPageChange - Function to call when page changes
 * @param {number} totalItems - Total number of items (optional)
 * @param {number} itemsPerPage - Number of items per page (optional)
 * @param {boolean} showSummary - Whether to show the items summary
 * @param {boolean} showPageNumbers - Whether to show numbered page buttons
 * @param {number} maxPageNumbers - Maximum number of page numbers to show
 */
const Pagination = ({
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    totalItems,
    itemsPerPage,
    showSummary = true,
    showPageNumbers = false,
    maxPageNumbers = 5
}) => {
    if (totalPages <= 1) return null;

    // Calculate start and end item numbers for summary
    const startItem = totalItems ? (currentPage - 1) * itemsPerPage + 1 : null;
    const endItem = totalItems ? Math.min(startItem + itemsPerPage - 1, totalItems) : null;

    // Calculate which page numbers to show
    const getPageNumbers = () => {
        if (!showPageNumbers) return [];

        const pages = [];
        let startPage = Math.max(1, currentPage - Math.floor(maxPageNumbers / 2));
        let endPage = Math.min(totalPages, startPage + maxPageNumbers - 1);

        // Adjust if we're near the end
        if (endPage - startPage + 1 < maxPageNumbers) {
            startPage = Math.max(1, endPage - maxPageNumbers + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 space-y-2 sm:space-y-0">
            {showSummary && totalItems && (
                <div className="text-sm text-gray-600">
                    Showing {startItem} to {endItem} of {totalItems} items
                </div>
            )}

            <div className="flex space-x-1">
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-md ${currentPage === 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    First
                </button>

                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-md ${currentPage === 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Prev
                </button>

                {showPageNumbers && pageNumbers.map(pageNum => (
                    <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        className={`px-3 py-1 rounded-md ${currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        {pageNum}
                    </button>
                ))}

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded-md ${currentPage === totalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Next
                </button>

                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded-md ${currentPage === totalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Last
                </button>
            </div>
        </div>
    );
};

export default Pagination; 