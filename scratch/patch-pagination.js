const fs = require('fs');

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const target = '    </div>\r\n  </div>\r\n</div>\r\n\r\n\r\n<!-- Quick Edit Modal';
  const targetLF = '    </div>\n  </div>\n</div>\n\n\n<!-- Quick Edit Modal';

  const paginationBar = `    </div>
    <!-- Pagination Bar -->
    <div class="pagination-bar" id="paginationBar">
      <div style="font-size: 13px; font-weight: 600; color: #475569;">
        Showing <span id="pageShowingStart">1</span>-<span id="pageShowingEnd">50</span> of <span id="pageTotalCount">513</span> inquiries
      </div>
      <div class="pagination-controls">
        <button class="page-btn" id="prevPageBtn" onclick="changePage(-1)">◀ Previous</button>
        <span class="page-indicator" id="pageIndicatorText">Page 1 of 11</span>
        <button class="page-btn" id="nextPageBtn" onclick="changePage(1)">Next ▶</button>
      </div>
    </div>
  </div>
</div>

<!-- Quick Edit Modal`;

  if (content.includes(target)) {
    content = content.replace(target, paginationBar);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Patched (CRLF):", filePath);
  } else if (content.includes(targetLF)) {
    content = content.replace(targetLF, paginationBar);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Patched (LF):", filePath);
  } else {
    // Search for the end of leadsTable
    const tableEndIdx = content.indexOf('        </tbody>\r\n      </table>\r\n    </div>');
    const tableEndIdxLF = content.indexOf('        </tbody>\n      </table>\n    </div>');
    console.log("Searching alternative indices:", tableEndIdx, tableEndIdxLF);
  }
}

patchFile('datauploadrawdata/today_parents_dashboard_upload.html');
patchFile('public/today_parents_dashboard_upload.html');
