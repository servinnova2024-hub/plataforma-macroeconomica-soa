
package com.plataforma.backend.controller;

import java.io.IOException;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.plataforma.backend.service.BcrpService;

@RestController
public class BcrpController {

    private final BcrpService bcrpService;

    public BcrpController(BcrpService bcrpService) {
        this.bcrpService = bcrpService;
    }

    @GetMapping(
        value = "/api/bcrp/tipo-cambio",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<String> consultarTipoCambio()
            throws IOException, InterruptedException {

        String datos = bcrpService.consultarTipoCambio();

        return ResponseEntity.ok(datos);
    }
}

