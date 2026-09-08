// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

library Base64 {
    bytes private constant ALPHABET =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        uint256 len = data.length;
        if (len == 0) return "";

        uint256 outLen = 4 * ((len + 2) / 3);
        bytes memory out = new bytes(outLen);

        uint256 i;
        uint256 j;
        while (i + 3 <= len) {
            uint256 chunk = (uint256(uint8(data[i])) << 16) |
                (uint256(uint8(data[i + 1])) << 8) |
                uint256(uint8(data[i + 2]));
            out[j] = ALPHABET[(chunk >> 18) & 0x3F];
            out[j + 1] = ALPHABET[(chunk >> 12) & 0x3F];
            out[j + 2] = ALPHABET[(chunk >> 6) & 0x3F];
            out[j + 3] = ALPHABET[chunk & 0x3F];
            i += 3;
            j += 4;
        }

        uint256 rem = len - i;
        if (rem == 1) {
            uint256 chunk = uint256(uint8(data[i])) << 16;
            out[j] = ALPHABET[(chunk >> 18) & 0x3F];
            out[j + 1] = ALPHABET[(chunk >> 12) & 0x3F];
            out[j + 2] = "=";
            out[j + 3] = "=";
        } else if (rem == 2) {
            uint256 chunk = (uint256(uint8(data[i])) << 16) | (uint256(uint8(data[i + 1])) << 8);
            out[j] = ALPHABET[(chunk >> 18) & 0x3F];
            out[j + 1] = ALPHABET[(chunk >> 12) & 0x3F];
            out[j + 2] = ALPHABET[(chunk >> 6) & 0x3F];
            out[j + 3] = "=";
        }

        return string(out);
    }
}
