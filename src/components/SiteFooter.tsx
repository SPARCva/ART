/** Replicates the sparcsolutions.org footer (dark navy grid + white bottom
 *  bar) so /ART matches every other page on the site. */
export function SiteFooter() {
  return (
    <>
      <footer className="mt-16 bg-pine pb-8 pt-16 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://sparcsolutions.org/images/SPARC_logo_white.png"
              alt="SPARC"
              className="mb-4 h-[60px] w-auto"
            />
            <p className="text-sm leading-relaxed">
              Specially Adapted Resource Centers provides community-integrated
              day programs for adults with severe and multiple disabilities in
              Northern Virginia. We believe every adult deserves a meaningful
              life filled with connection, purpose, and belonging.
            </p>
            <div className="mt-4 flex gap-3">
              <a href="https://www.facebook.com/profile.php?id=100064372517571" aria-label="Facebook" target="_blank" rel="noreferrer" className="text-white/90 hover:text-white">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
              </a>
              <a href="https://www.instagram.com/sparc.solutions/" aria-label="Instagram" target="_blank" rel="noreferrer" className="text-white/90 hover:text-white">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://www.linkedin.com/company/specially-adapted-resource-centers" aria-label="LinkedIn" target="_blank" rel="noreferrer" className="text-white/90 hover:text-white">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"/></svg>
              </a>
              <a href="https://www.youtube.com/@SPARC_VA" aria-label="YouTube" target="_blank" rel="noreferrer" className="text-white/90 hover:text-white">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              <a href="mailto:debi@sparcsolutions.org" aria-label="Email" className="text-white/90 hover:text-white">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
              </a>
            </div>
          </div>
          <nav aria-label="Quick links">
            <h4 className="font-display text-base font-bold">Quick Links</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="https://sparcsolutions.org/about/" className="hover:underline">About Us</a></li>
              <li><a href="https://sparcsolutions.org/programs/" className="hover:underline">Programs</a></li>
              <li><a href="https://sparcsolutions.org/locations/" className="hover:underline">Locations &amp; Pricing</a></li>
              <li><a href="https://sparcsolutions.org/events/" className="hover:underline">Events</a></li>
              <li><a href="https://sparcsolutions.org/stories/" className="hover:underline">Stories &amp; Impact</a></li>
              <li><a href="https://sparcsolutions.org/donate-checkout/" className="hover:underline">Donate</a></li>
              <li><a href="https://sparcsolutions.org/monthly/" className="font-bold hover:underline">Monthly Giving</a></li>
            </ul>
          </nav>
          <nav aria-label="Resources">
            <h4 className="font-display text-base font-bold">Resources</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="https://sparcsolutions.org/financials/" className="hover:underline">Annual Reports</a></li>
              <li><a href="https://sparcsolutions.org/board/" className="hover:underline">Board of Directors</a></li>
              <li><a href="https://sparcsolutions.org/news/" className="hover:underline">News &amp; Press</a></li>
              <li><a href="https://sparcsolutions.org/get-involved/" className="hover:underline">Get Involved</a></li>
              <li><a href="https://sparcsolutions.org/contact/" className="hover:underline">Contact Us</a></li>
            </ul>
          </nav>
          <div>
            <h4 className="font-display text-base font-bold">Contact</h4>
            <p className="mt-3 text-sm"><strong>Mailing Address:</strong><br />1775 Tysons Blvd., Fifth Floor<br />Tysons, VA 22102</p>
            <p className="mt-2 text-sm"><strong>Phone:</strong> <a href="tel:571-407-1807" className="hover:underline">(571) 407-1807</a></p>
            <p className="mt-2 text-sm"><a href="mailto:debi@sparcsolutions.org" className="hover:underline">debi@sparcsolutions.org</a></p>
          </div>
        </div>
      </footer>
      <div className="bg-white py-7 text-pine">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 text-sm">
          <div>
            <p>&copy; 2026 SPARC - Specially Adapted Resource Centers. All rights reserved.</p>
            <p>501(c)(3) Nonprofit Organization | EIN: 20-5513060</p>
            <nav aria-label="Legal links" className="mt-1">
              <a href="https://sparcsolutions.org/accessibility/" className="hover:underline">Accessibility</a>
              {" | "}
              <a href="https://sparcsolutions.org/contact/" className="hover:underline">Contact</a>
            </nav>
          </div>
          <p className="text-xs text-moss">Map data © OpenStreetMap contributors</p>
        </div>
      </div>
    </>
  );
}
