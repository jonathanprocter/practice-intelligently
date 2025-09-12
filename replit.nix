{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.nano
    pkgs.lsof
    pkgs.nodejs_18  # Changed from nodejs_20 to nodejs_18
    pkgs.postgresql_16
    pkgs.git
    pkgs.openssl
    pkgs.pkg-config
    pkgs.systemd
    pkgs.yarn
    pkgs.python311
    pkgs.python311Packages.pip
    pkgs.nodePackages.typescript
    pkgs.nodePackages.typescript-language-server
    pkgs.nodePackages.pm2
    pkgs.ghostscript
    pkgs.graphicsmagick
    pkgs.imagemagick
    pkgs.poppler_utils
  ];

  env = {
    LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
      pkgs.openssl
      pkgs.systemd
    ];

    NODE_ENV = "development";
    PATH = "${pkgs.nodejs_18}/bin:${pkgs.yarn}/bin:${pkgs.git}/bin:$PATH";  # Updated to nodejs_18
  };
}
