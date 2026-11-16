
package com.plataforma.backend.controller;

import java.io.IOException;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.plataforma.backend.service.MefService;

@RestController
public class MefController {

    private final MefService mefService;

    public MefController(MefService mefService) {
        this.mefService = mefService;
    }

    // Endpoint existente: consulta de registros para la tabla.
    @GetMapping(
        value = "/api/mef/ejecucion-gasto",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<String> consultarEjecucion(
            @RequestParam(required = false) String departamento)
            throws IOException, InterruptedException {

        return ResponseEntity.ok(
            mefService.consultarEjecucionGasto(departamento)
        );
    }

    // Nuevo endpoint: resumen de ejecución presupuestal.
    @GetMapping(
        value = "/api/mef/resumen-ejecucion",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<Map<String, Object>> consultarResumen(
            @RequestParam(required = false) String departamento,
            @RequestParam(defaultValue = "2025") Integer anio)
            throws IOException, InterruptedException {

        Map<String, Object> resumen =
                mefService.consultarResumenEjecucion(departamento, anio);

        return ResponseEntity.ok(resumen);
    }
}
