// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title Paperkite renderer
/// @notice Draws a layered paper landscape from a seed. Nothing lives off chain.
contract Paperkite {
    struct Rand { uint32 x; }

    struct Stock {
        string name;
        string sky0;
        string sky1;
        string sky2;
        string disc;
        string kite;
        string warm;
        string[6] layers;
    }

    struct Scene {
        uint256 stock;
        uint256 layerCount;
        bool hasKite;
        uint256 birdCount;
        bool hasWater;
        bool hasFog;
        uint256 discR;
        uint256 discX;
        uint256 discY;
        uint256 rings;
        bool hasCottage;
    }

    function next(Rand memory r, uint256 n) internal pure returns (uint256) {
        uint32 x = r.x;
        x = x ^ (x << 13);
        x = x ^ (x >> 17);
        x = x ^ (x << 5);
        r.x = x;
        return uint256(x) % n;
    }

    function u(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 len;
        for (uint256 t = v; t != 0; t /= 10) len++;
        bytes memory b = new bytes(len);
        while (v != 0) { b[--len] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(b);
    }

    function i(int256 v) internal pure returns (string memory) {
        if (v < 0) return string.concat("-", u(uint256(-v)));
        return u(uint256(v));
    }

    function stockAt(uint256 k) internal pure returns (Stock memory) {
        if (k == 0) return Stock("dawn", "#fbdfc4", "#f8c6a4", "#f4a98a", "#fff3e0", "#b4483c", "#ffd98a",
            ["#efa98c", "#e0876f", "#c46a62", "#9c4c57", "#6e3550", "#3f2038"]);
        if (k == 1) return Stock("dusk", "#9d99d6", "#7a74ae", "#5a5490", "#f5ecd6", "#e2b24c", "#ffd27a",
            ["#7c78b4", "#676198", "#514b7d", "#3b3660", "#272343", "#14122a"]);
        if (k == 2) return Stock("night", "#223057", "#14203a", "#0a1020", "#eaf0f8", "#d9a441", "#ffc861",
            ["#2c3d63", "#24334f", "#1c283e", "#14202f", "#0d1622", "#060c14"]);
        if (k == 3) return Stock("harvest", "#f9ecc8", "#f3d491", "#edbe72", "#fff8e6", "#7a3b2e", "#ffcf6b",
            ["#e9b871", "#d89a55", "#c07c42", "#98603a", "#6b4028", "#40251a"]);
        if (k == 4) return Stock("mist", "#eef3f0", "#dae3df", "#c6d2cc", "#ffffff", "#c0553f", "#ffd489",
            ["#c3cfc9", "#a9b8b2", "#8b9c97", "#667874", "#445553", "#263533"]);
        return Stock("ember", "#fbd7a8", "#f0a172", "#e2704b", "#ffe9c4", "#2e1a2b", "#ffd08a",
            ["#ee9a6a", "#dd7550", "#c4553f", "#98392f", "#6a2126", "#3a1220"]);
    }

    function ringOp(uint256 k) internal pure returns (string memory) {
        return k == 0 ? ".115" : ".07";
    }

    function waterOp(uint256 k) internal pure returns (string memory) {
        if (k == 0) return ".5";
        if (k == 1) return ".4";
        if (k == 2) return ".3";
        return ".2";
    }

    function ridgePoints(Rand memory r, int256 base, int256 amp, uint256 n)
        internal pure returns (int256[] memory px, int256[] memory py)
    {
        px = new int256[](n + 1);
        py = new int256[](n + 1);
        for (uint256 k = 0; k <= n; k++) {
            px[k] = int256(1000 * k / n);
            py[k] = base - (amp * int256(next(r, 1000))) / 1000;
        }
    }

    function smoothRidge(int256[] memory px, int256[] memory py)
        internal pure returns (string memory d)
    {
        d = string.concat("M0,", i(py[0]));
        uint256 last = px.length - 1;
        for (uint256 k = 0; k < last; k++) {
            uint256 a = k == 0 ? 0 : k - 1;
            uint256 b = k + 2 > last ? last : k + 2;
            d = string.concat(d, "C",
                i(px[k] + (px[k + 1] - px[a]) / 6), ",", i(py[k] + (py[k + 1] - py[a]) / 6), " ",
                i(px[k + 1] - (px[b] - px[k]) / 6), ",", i(py[k + 1] - (py[b] - py[k]) / 6), " ",
                i(px[k + 1]), ",", i(py[k + 1]));
        }
    }

    function peakedRidge(int256[] memory px, int256[] memory py)
        internal pure returns (string memory d)
    {
        d = string.concat("M0,", i(py[0]));
        for (uint256 k = 1; k < px.length; k++) {
            d = string.concat(d, "L", i(px[k]), ",", i(py[k]));
        }
    }

    function closeDown(string memory d) internal pure returns (string memory) {
        return string.concat(d, "L1000,1000L0,1000Z");
    }

    function conifer(int256 x, int256 groundY, int256 h, string memory color)
        internal pure returns (string memory s)
    {
        int256 w = h * 42 / 100;
        s = string.concat('<g fill="', color, '">');
        for (uint256 k = 0; k < 3; k++) {
            int256 top = groundY - h + (h * 29 / 100) * int256(k);
            int256 half = w * (55 + 22 * int256(k)) / 200;
            int256 bot = top + h * 44 / 100;
            s = string.concat(s, '<path d="M', i(x), ",", i(top), "L", i(x + half), ",", i(bot),
                "L", i(x - half), ",", i(bot), 'Z"/>');
        }
        s = string.concat(s, '<rect x="', i(x - h * 3 / 100), '" y="', i(groundY - h * 12 / 100),
            '" width="', i(h * 6 / 100), '" height="', i(h * 13 / 100), '"/></g>');
    }

    function cottage(int256 x, int256 groundY, string memory color, string memory warm)
        internal pure returns (string memory s)
    {
        int256 top = groundY - 46;
        s = string.concat('<g><path d="M', i(x - 41), ",", i(top),
            "L", i(x), ",", i(top - 34), "L", i(x + 41), ",", i(top),
            'Z" fill="', color, '"/>');
        s = string.concat(s, '<rect x="', i(x - 31), '" y="', i(top),
            '" width="62" height="46" fill="', color, '"/>');
        s = string.concat(s, '<rect x="', i(x - 9), '" y="', i(top + 12),
            '" width="18" height="16" fill="', warm, '"/>');
        s = string.concat(s, '<rect x="', i(x + 9), '" y="', i(top - 50),
            '" width="12" height="22" fill="', color, '"/></g>');
    }

    function bird(int256 x, int256 y, int256 s, string memory color)
        internal pure returns (string memory)
    {
        int256 a = s / 2;
        int256 b = s * 6 / 10;
        return string.concat('<path d="M', i(x - s), ",", i(y), "q", i(a), ",", i(-b), " ", i(s),
            ",0q", i(a), ",", i(-b), " ", i(s), ',0" fill="none" stroke="', color,
            '" stroke-width="', i(s * 22 / 100), '" stroke-linecap="round"/>');
    }

    function kiteShape(int256 x, int256 y, int256 s, string memory color, int256 dir)
        internal pure returns (string memory out)
    {
        int256 wide = s * 62 / 100;
        out = string.concat('<g><path d="M', i(x), ",", i(y - s), "L", i(x + wide), ",", i(y),
            "L", i(x), ",", i(y + s), "L", i(x - wide), ",", i(y), 'Z" fill="', color, '"/>');
        out = string.concat(out, '<path d="M', i(x), ",", i(y - s), "L", i(x), ",", i(y + s),
            '" stroke="rgba(255,255,255,.35)" stroke-width="', i(s * 6 / 100), '"/>');
        out = string.concat(out, '<path d="M', i(x), ",", i(y + s),
            "q", i(s * 90 / 100 * dir), ",", i(s * 80 / 100), " ", i(s * 20 / 100 * dir), ",", i(s * 180 / 100),
            "q", i(-(s * 80 / 100 * dir)), ",", i(s * 70 / 100), " ", i(s * 10 / 100 * dir), ",", i(s * 150 / 100),
            '" fill="none" stroke="', color, '" stroke-width="', i(s * 11 / 100),
            '" stroke-linecap="round"/></g>');
    }

    function roll(uint256 seed) internal pure returns (Scene memory s, Rand memory r) {
        uint32 x = uint32(seed);
        if (x == 0) x = 0x9e3779b9;
        r = Rand(x);
        s.stock = next(r, 6);
        s.layerCount = 4 + next(r, 3);
        s.hasKite = next(r, 100) < 34;
        s.birdCount = next(r, 100) < 55 ? 2 + next(r, 4) : 0;
        s.hasWater = next(r, 100) < 34;
        s.hasFog = next(r, 100) < 45;
        s.discR = 55 + next(r, 85);
        s.discX = 180 + next(r, 640);
        s.discY = 180 + next(r, 170);
        s.rings = next(r, 100) < 40 ? 2 : 0;
        s.hasCottage = next(r, 100) < 38;
    }

    function defs(Stock memory st, string memory g) internal pure returns (string memory out) {
        out = string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs>',
            '<linearGradient id="a', g, '" x1="0" y1="0" x2="0" y2="1">',
            '<stop offset="0" stop-color="', st.sky0, '"/>',
            '<stop offset="0.55" stop-color="', st.sky1, '"/>',
            '<stop offset="1" stop-color="', st.sky2, '"/></linearGradient>'
        );
        out = string.concat(out,
            '<radialGradient id="b', g, '">',
            '<stop offset="0" stop-color="', st.disc, '" stop-opacity=".55"/>',
            '<stop offset="1" stop-color="', st.disc, '" stop-opacity="0"/></radialGradient>',
            '<linearGradient id="c', g, '" x1="0" y1="0" x2="0" y2="1">',
            '<stop offset="0" stop-color="#ffffff" stop-opacity="0"/>',
            '<stop offset="0.5" stop-color="#ffffff" stop-opacity=".26"/>',
            '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>'
        );
        out = string.concat(out,
            '<radialGradient id="v', g, '">',
            '<stop offset="0.6" stop-color="#000000" stop-opacity="0"/>',
            '<stop offset="1" stop-color="#000000" stop-opacity=".26"/></radialGradient>',
            '<filter id="n', g, '"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3"/>',
            "</filter></defs>"
        );
    }

    function sky(Scene memory s, Stock memory st, string memory g)
        internal pure returns (string memory out)
    {
        out = string.concat(defs(st, g),
            '<rect width="1000" height="1000" fill="url(#a', g, ')"/>',
            '<circle cx="', u(s.discX), '" cy="', u(s.discY), '" r="', u(s.discR * 3),
            '" fill="url(#b', g, ')"/>'
        );
        for (uint256 k = 1; k <= s.rings; k++) {
            out = string.concat(out, '<circle cx="', u(s.discX), '" cy="', u(s.discY),
                '" r="', u(s.discR + k * 34), '" fill="none" stroke="', st.disc,
                '" stroke-opacity="', ringOp(k - 1), '" stroke-width="2"/>');
        }
        out = string.concat(out, '<circle cx="', u(s.discX), '" cy="', u(s.discY),
            '" r="', u(s.discR), '" fill="', st.disc, '"/>');
    }

    function layers(Scene memory s, Stock memory st, Rand memory r, string memory g)
        internal pure returns (string memory out)
    {
        int256 step = int256(400 / (s.layerCount - 1));
        uint256 fogAt = s.layerCount / 2;

        for (uint256 k = 0; k < s.layerCount; k++) {
            int256 base = 430 + step * int256(k);
            bool angular = k < 2 && next(r, 100) < 60;
            uint256 n = angular ? 5 + next(r, 4) : 4 + next(r, 3);
            int256 amp = angular ? int256(150 - 22 * k) : int256(92 - 12 * k);
            (int256[] memory px, int256[] memory py) = ridgePoints(r, base, amp, n);
            string memory ridge = angular ? peakedRidge(px, py) : smoothRidge(px, py);

            out = string.concat(out,
                '<path d="', closeDown(ridge), '" transform="translate(0,-9)" fill="rgba(0,0,0,.17)"/>',
                '<path d="', closeDown(ridge), '" fill="', st.layers[k * 5 / (s.layerCount - 1)], '"/>',
                '<path d="', ridge, '" fill="none" stroke="rgba(255,255,255,.20)" stroke-width="2"/>'
            );

            if (s.hasFog && k == fogAt) {
                out = string.concat(out, '<rect x="0" y="', i(base - 26),
                    '" width="1000" height="86" fill="url(#c', g, ')"/>');
            }
            if (k == s.layerCount - 2) {
                uint256 trees = 3 + next(r, 6);
                string memory tcol = st.layers[(k + 1) * 5 / (s.layerCount - 1)];
                int256 groundY = base + step * 55 / 100;
                for (uint256 t = 0; t < trees; t++) {
                    out = string.concat(out,
                        conifer(int256(60 + next(r, 880)), groundY, int256(46 + next(r, 54)), tcol));
                }
                if (s.hasCottage) {
                    out = string.concat(out,
                        cottage(int256(150 + next(r, 700)), groundY, tcol, st.warm));
                }
            }
        }
    }

    function render(uint256 seed) public pure returns (string memory out) {
        (Scene memory s, Rand memory r) = roll(seed);
        Stock memory st = stockAt(s.stock);
        string memory g = string.concat("s", u(seed));

        out = sky(s, st, g);

        for (uint256 k = 0; k < s.birdCount; k++) {
            out = string.concat(out, bird(int256(120 + next(r, 760)), int256(200 + next(r, 260)),
                int256(11 + next(r, 9)), st.layers[5]));
        }

        if (s.hasKite) {
            int256 kx = int256(200 + next(r, 600));
            int256 ky = int256(250 + next(r, 190));
            int256 ks = int256(34 + next(r, 20));
            int256 dir = next(r, 2) == 0 ? int256(1) : int256(-1);
            out = string.concat(out, '<path d="M', i(kx), ",", i(ky), "L", i(kx - 120), ",", i(ky + 300),
                '" stroke="', st.layers[5], '" stroke-opacity=".45" stroke-width="2" fill="none"/>');
            out = string.concat(out, kiteShape(kx, ky, ks, st.kite, dir));
        }

        out = string.concat(out, layers(s, st, r, g));

        if (s.hasWater) {
            out = string.concat(out, '<rect x="0" y="880" width="1000" height="120" fill="',
                st.layers[1], '" opacity=".85"/>');
            for (uint256 k = 0; k < 4; k++) {
                uint256 lw = 150 - k * 26;
                out = string.concat(out, '<rect x="', u(s.discX - lw / 2), '" y="', u(896 + k * 22),
                    '" width="', u(lw), '" height="6" fill="', st.disc,
                    '" opacity="', waterOp(k), '"/>');
            }
        }

        out = string.concat(out, '<rect width="1000" height="1000" filter="url(#n', g, ')" opacity=".07"/>',
            '<rect width="1000" height="1000" fill="url(#v', g, ')"/></svg>');
    }

    function traits(uint256 seed) public pure returns (string memory out) {
        (Scene memory s, ) = roll(seed);
        out = string.concat(stockAt(s.stock).name, ", ", u(s.layerCount), " layers");
        if (s.hasKite) out = string.concat(out, ", kite");
        if (s.hasCottage) out = string.concat(out, ", cottage");
        if (s.hasWater) out = string.concat(out, ", water");
        if (s.hasFog) out = string.concat(out, ", fog");
    }
}
