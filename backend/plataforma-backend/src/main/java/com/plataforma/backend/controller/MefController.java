
package com.plataforma.backend.controller;

import java.io.IOException;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.plataforma.backend.service.MefService;

@RestController
public class MefController {

    private final MefService mefService;

    public MefController(MefService mefService) {
        this.mefService = mefService;
    }

    @GetMapping(
        value = "/api/mef/ejecucion-gasto",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<String> consultarEjecucion()
            throws IOException, InterruptedException {

        return ResponseEntity.ok(
            mefService.consultarEjecucionGasto()
        );
    }
}
